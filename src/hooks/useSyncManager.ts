import { useCallback, useEffect, useState, useRef } from 'react';
// Note: types from '../types' not needed here; keep hook focused on sync pipeline
import { saveHistoryRecord, pullAllHistoryRecords, saveIncompleteHistoryRecord, listIncompleteHistoryRecords, deleteIncompleteHistoryRecord } from '../services/history';
import { useHistoryManager } from './useHistoryManager';
import { 
  logSyncError, 
  logNetworkError, 
  logDataConflict, 
  logSyncSuccess, 
  logSyncFailure,
  errorLogger 
} from '../utils/errorLogging';
import { 
  logSyncProcess, 
  logStorageOperation 
} from '../utils/testLogger';

// 同步配置常量
const SYNC_TIMEOUT_MS = 30000; // 30秒超时
const MAX_RETRY_COUNT = 3; // 最大重试次数
const DEBOUNCE_DELAY_MS = 1000; // 防抖延迟

type PendingItem = {
  client_id: string;
  payload: any;
  retry: number;
};

// 同步队列上限（仅针对“未上云的待同步记录”）
const OUTBOX_LIMIT = 50;

function outboxKey(userId: string) {
  return `sync_outbox_${userId}`;
}

function loadOutbox(userId: string): PendingItem[] {
  try {
    const raw = localStorage.getItem(outboxKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOutbox(userId: string, items: PendingItem[]) {
  const key = outboxKey(userId);
  if (!items || items.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  // 仅保留最近 OUTBOX_LIMIT 条（FIFO，丢弃最早项）
  const trimmed = items.length > OUTBOX_LIMIT ? items.slice(items.length - OUTBOX_LIMIT) : items;
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function useSyncManager(onlineUserId: string | null) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  // 注意：不要在此 hook 内部创建新的 history 管理实例，避免引用变动导致 flush 依赖抖动
  // 在当前实现中，为保持简单仍引用一次，但我们不会把 history 放入 flush 的依赖数组，避免每次渲染重建回调
  const history = useHistoryManager();
  
  // 使用 ref 来存储防抖定时器和同步状态
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastAutoSyncUserRef = useRef<string | null>(null);
  
  // 组件卸载时清理
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);





  const enqueueRecord = useCallback((serverPayload: any) => {
    console.log('[sync] enqueueRecord 调用:', { 
      onlineUserId, 
      clientId: serverPayload?.client_id,
      payloadKeys: Object.keys(serverPayload || {})
    });
    
    if (!onlineUserId) {
      console.warn('[sync] enqueueRecord: 无在线用户ID');
      logSyncProcess('enqueue_skip', { reason: 'no_user_id' }, onlineUserId || undefined);
      return;
    }
    
    logSyncProcess('enqueue_start', { client_id: serverPayload.client_id }, onlineUserId);
    
    const queue = loadOutbox(onlineUserId);
    console.log('[sync] 当前队列状态:', { 
      queueLength: queue.length,
      outboxKey: outboxKey(onlineUserId),
      existingItems: queue.map(q => q.client_id)
    });
    
    const exists = queue.some(q => q.client_id === serverPayload.client_id);
    
    if (exists) {
      console.warn('[sync] 记录已存在队列中:', serverPayload.client_id);
      logSyncProcess('enqueue_duplicate', { client_id: serverPayload.client_id }, onlineUserId);
      return;
    }
    
    queue.push({ client_id: serverPayload.client_id, payload: serverPayload, retry: 0 });
    saveOutbox(onlineUserId, queue);
    
    console.log('[sync] 记录已入队:', { 
      clientId: serverPayload.client_id,
      newQueueLength: queue.length 
    });
    
    logStorageOperation('set', `sync_outbox_${onlineUserId}`, { count: queue.length }, onlineUserId);
    
    logSyncProcess('enqueue_success', { 
      client_id: serverPayload.client_id, 
      queue_length: queue.length,
      payload_size: JSON.stringify(serverPayload).length 
    }, onlineUserId);
  }, [onlineUserId]);

  // 用于把“本地历史”补传到当前账号：传入本地记录数组（已转服务端字段），逐条入队
  const enqueueBatch = useCallback((payloads: any[]) => {
    if (!onlineUserId || !Array.isArray(payloads) || payloads.length === 0) return 0;
    let added = 0;
    const queue = loadOutbox(onlineUserId);
    for (const p of payloads) {
      if (!queue.some(q => q.client_id === p.client_id)) {
        queue.push({ client_id: p.client_id, payload: p, retry: 0 });
        added += 1;
      }
    }
    saveOutbox(onlineUserId, queue);
    return added;
  }, [onlineUserId]);

  const flush = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!onlineUserId || syncing || !isOnline) {
      logSyncProcess('flush_skip', { 
        onlineUserId: !!onlineUserId, 
        syncing, 
        isOnline 
      }, onlineUserId || undefined);
      return { 
        success: false, 
        message: !onlineUserId ? '未登录在线账户' : 
                syncing ? '正在同步中' : '网络未连接'
      };
    }
    
    const startTime = Date.now();
    logSyncProcess('flush_start', { 
      userId: onlineUserId, 
      timestamp: startTime,
      networkStatus: navigator.onLine 
    }, onlineUserId);
    
    // 清除之前的错误状态
    setLastError(null);
    setSyncing(true);
    
    // 设置超时保护
    const timeoutPromise = new Promise((_, reject) => {
      syncTimeoutRef.current = setTimeout(() => {
        logSyncProcess('flush_timeout', { 
          userId: onlineUserId, 
          duration: SYNC_TIMEOUT_MS 
        }, onlineUserId);
        reject(new Error('同步操作超时'));
      }, SYNC_TIMEOUT_MS);
    });
    
    try {
      // 使用 Promise.race 来实现超时控制
      await Promise.race([
        syncOperation(onlineUserId, history),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      
      // 同步成功，更新状态并记录
      if (isMountedRef.current) {
        setLastSyncAt(Date.now());
        setLastError(null);
      }
      
      logSyncProcess('flush_success', { 
        userId: onlineUserId, 
        duration,
        timestamp: Date.now() 
      }, onlineUserId);
      
      logSyncSuccess(`同步操作成功完成`, duration, {
        userId: onlineUserId,
        timestamp: Date.now()
      });
      
      return { success: true, message: '同步成功完成' };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '同步失败';
      
      // 更新本地状态
      if (isMountedRef.current) {
        setLastError(errorMessage);
      }
      
      // 分类记录错误
      if (error instanceof Error) {
        if (error.message.includes('超时') || error.message.includes('timeout')) {
          logSyncFailure(`同步操作超时`, duration, '超时错误', {
            userId: onlineUserId,
            timeout: SYNC_TIMEOUT_MS,
            error: errorMessage
          });
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          logNetworkError(`网络同步失败: ${errorMessage}`, {
            userId: onlineUserId,
            duration,
            error: errorMessage
          });
          logSyncFailure(`网络同步失败`, duration, '网络错误', {
            userId: onlineUserId,
            error: errorMessage
          });
        } else {
          logSyncError(`同步操作失败: ${errorMessage}`, {
            userId: onlineUserId,
            duration,
            error: errorMessage,
            stackTrace: error.stack
          });
          logSyncFailure(`同步操作失败`, duration, '其他错误', {
            userId: onlineUserId,
            error: errorMessage
          });
        }
      }
      
      return { success: false, message: errorMessage };
      
    } finally {
      // 清理超时定时器
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      
      // 确保组件仍然挂载时才更新状态
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  // 重要：不把 history 放进依赖，避免其引用变化触发 flush 重建
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUserId, syncing, isOnline]);

  // 登录时自动同步：当onlineUserId变化且不为null时，自动触发同步
  useEffect(() => {
    if (onlineUserId && isOnline && lastAutoSyncUserRef.current !== onlineUserId) {
      console.log('[sync] 用户登录，自动触发初始同步:', onlineUserId);
      lastAutoSyncUserRef.current = onlineUserId; // 标记已处理
      
      // 延迟执行，避免初始化时的竞态问题
      const timer = setTimeout(async () => {
        if (!isMountedRef.current) return;
        
        try {
          // 直接调用同步逻辑，避免依赖flush函数
          setSyncing(true);
          await syncOperation(onlineUserId, history);
          setLastSyncAt(Date.now());
          console.log('[sync] 登录后自动同步完成');
        } catch (error) {
          console.error('[sync] 登录后自动同步出错:', error);
          setLastError(error instanceof Error ? error.message : '同步失败');
        } finally {
          if (isMountedRef.current) {
            setSyncing(false);
          }
        }
      }, 1500); // 1.5秒延迟，确保组件完全初始化

      return () => clearTimeout(timer);
    }
  }, [onlineUserId, isOnline]); // 移除flush依赖，避免无限循环

  // 多设备实时同步：定期pull最新数据（修复依赖项问题）
  useEffect(() => {
    if (!onlineUserId || !isOnline) return;

    console.log('[sync] 启动多设备同步定时器（每10秒检查一次）');
    
    // 每10秒检查一次是否有新的云端数据（缩短间隔提高响应性）
    const multiDeviceSyncInterval = setInterval(async () => {
      if (!isMountedRef.current) {
        console.log('[sync] 跳过多设备同步检查（组件已卸载）');
        return;
      }
      
      // 使用当前的同步状态，而不是依赖closure中的值
      if (syncing) {
        console.log('[sync] 跳过多设备同步检查（正在同步中）');
        return;
      }
      
      try {
        console.log('[sync] 🔄 多设备同步检查开始...', new Date().toLocaleTimeString());
        setSyncing(true);
        
        // 直接调用同步逻辑，绕过flush的复杂性
        const result = await syncOperation(onlineUserId, history);
        console.log('[sync] ✅ 多设备同步检查完成', {
          时间: new Date().toLocaleTimeString(),
          结果: result || '同步成功'
        });
      } catch (error) {
        console.error('[sync] ❌ 多设备同步检查失败:', error);
      } finally {
        if (isMountedRef.current) {
          setSyncing(false);
        }
      }
    }, 10000); // 10秒间隔，提高响应性

    return () => {
      console.log('[sync] 清理多设备同步定时器');
      clearInterval(multiDeviceSyncInterval);
    };
  }, [onlineUserId, isOnline]); // 🔧 移除syncing和history依赖，避免定时器重启
  
  // 实际的同步操作逻辑
  const syncOperation = async (userId: string, historyManager: any) => {
    // push 阶段
    const queue = loadOutbox(userId);
    console.log('[sync] syncOperation 开始:', { 
      userId, 
      queueLength: queue.length,
      outboxKey: outboxKey(userId),
      queue: queue.map(item => ({ client_id: item.client_id, retry: item.retry }))
    });
    
    if (queue.length > 0) {
      console.log('[sync] pushing', queue.length, 'items');
    } else {
      console.log('[sync] 队列为空，跳过push阶段');
    }
    
    const nextQueue: PendingItem[] = [];
    let successCount = 0;
    let completedRecords: any[] = [];
    let incompleteRecords: any[] = [];
    let mergedCompletedCount = 0;
    let mergedIncompleteCount = 0;
    
    for (const item of queue) {
      try {
        // 检查重试次数
        if (item.retry >= MAX_RETRY_COUNT) {
          logSyncError(`放弃重试项目，已达到最大重试次数`, {
            clientId: item.client_id,
            retryCount: item.retry,
            maxRetries: MAX_RETRY_COUNT,
            payload: item.payload
          }, userId, item.client_id);
          continue;
        }
        
        console.log(`[sync] upsert payload (重试 ${item.retry}/${MAX_RETRY_COUNT}):`, item.client_id);
        
        if (item.payload && item.payload.planned_total_problems) {
          await saveIncompleteHistoryRecord(userId, item.payload);
        } else {
          await saveHistoryRecord(userId, item.payload);
        }
        
        console.log('[sync] upsert ok for', item.client_id);
        successCount++;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '上传失败';
        
        // 记录上传错误
        logSyncError(`记录上传失败`, {
          clientId: item.client_id,
          retryCount: item.retry,
          error: errorMessage,
          payload: item.payload
        }, userId, item.client_id);
        
        // 检查是否为数据库约束错误（可能的数据冲突）
        if (errorMessage.includes('unique') || errorMessage.includes('constraint')) {
          logDataConflict(`数据约束冲突，可能存在重复记录`, {
            clientId: item.client_id,
            error: errorMessage,
            payload: item.payload
          }, userId, item.client_id);
        }
        
        // 增加重试次数
        item.retry += 1;
        if (item.retry < MAX_RETRY_COUNT) {
          nextQueue.push(item);
        } else {
          logSyncError(`彻底放弃重试项目 ${item.client_id}`, {
            clientId: item.client_id,
            finalRetryCount: item.retry,
            lastError: errorMessage
          }, userId, item.client_id);
        }
      }
    }
    
    // 保存失败队列，成功的项目已从队列中移除
    saveOutbox(userId, nextQueue);
    
    // pull 阶段 - 拉取完成记录和未完成记录
    console.log('[sync] 开始从云端拉取历史记录...');
    try {
      // 拉取完成记录
      completedRecords = await pullAllHistoryRecords(userId);
      console.log(`[sync] 从云端获取到 ${completedRecords.length} 条完成记录`);
      
      mergedCompletedCount = historyManager.mergeServerRecords(completedRecords as any, userId);
      console.log(`[sync] 成功合并 ${mergedCompletedCount} 条完成记录到本地`);
      
      // 拉取未完成记录
      incompleteRecords = await listIncompleteHistoryRecords(userId);
      console.log(`[sync] 从云端获取到 ${incompleteRecords.length} 条未完成记录`);
      
      mergedIncompleteCount = historyManager.mergeServerIncompleteRecords(incompleteRecords as any, userId);
      console.log(`[sync] 成功合并 ${mergedIncompleteCount} 条未完成记录到本地`);
      
      // 如果有数据合并，强制刷新以确保UI立即更新
      if (mergedCompletedCount > 0 || mergedIncompleteCount > 0) {
        console.log('[sync] 🎯 检测到新数据，触发UI刷新', {
          新完成记录: mergedCompletedCount,
          新未完成记录: mergedIncompleteCount
        });
        historyManager.refreshRecords();
        
        // 派发全局事件通知App组件强制刷新
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('syncComplete', {
            detail: { mergedCompletedCount, mergedIncompleteCount }
          });
          window.dispatchEvent(event);
          console.log('[sync] 📢 已派发syncComplete事件');
        }
      } else {
        console.log('[sync] ℹ️ 无新数据需要合并');
      }
      
      console.log('[sync] pull completed successfully');
      
      // 记录pull成功日志
      logSyncProcess('pull_success', {
        completedRecords: completedRecords.length,
        incompleteRecords: incompleteRecords.length,
        mergedCompleted: mergedCompletedCount,
        mergedIncomplete: mergedIncompleteCount,
        userId: userId
      }, userId);
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '下载失败';
      
      console.error('[sync] pull 阶段失败:', errorMessage);
      logSyncError(`从服务器拉取数据失败`, {
        error: errorMessage,
        userId: userId
      }, userId);
      
      logSyncProcess('pull_failure', {
        error: errorMessage,
        userId: userId
      }, userId);
      
      // 不重新抛出错误，返回错误信息
      return {
        success: false,
        error: errorMessage,
        push: { 成功: successCount, 失败: queue.length - successCount },
        pull: { 错误: errorMessage }
      };
    }
    
    console.log(`[sync] 同步完成，成功上传 ${successCount} 项，队列剩余 ${nextQueue.length} 项`);
    
    // 返回同步结果摘要
    return {
      success: true,
      push: { 成功: successCount, 失败: queue.length - successCount },
      pull: { 
        完成记录: completedRecords.length, 
        未完成记录: incompleteRecords.length,
        新合并完成: mergedCompletedCount,
        新合并未完成: mergedIncompleteCount
      }
    };
    
    // 记录同步统计信息
    if (nextQueue.length > 0) {
      logSyncError(`同步完成但有 ${nextQueue.length} 项失败`, {
        successCount,
        failedCount: nextQueue.length,
        failedItems: nextQueue.map(item => ({
          clientId: item.client_id,
          retryCount: item.retry
        }))
      }, userId);
    }
  };

  // 带防抖的 flush 函数
  const debouncedFlush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && onlineUserId && isOnline) {
        flush();
      }
    }, DEBOUNCE_DELAY_MS);
  }, [flush, onlineUserId, isOnline]);

  useEffect(() => {
    if (!onlineUserId) return;
    
    // 网络状态变化监听（带防抖）
    const onOnline = () => {
      console.log('[sync] 网络连接恢复，准备同步...');
      debouncedFlush();
    };
    
    // 网络质量检测
    const checkNetworkQuality = async () => {
      if (!navigator.onLine) return false;
      
      try {
        const start = Date.now();
        const response = await fetch('/', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000) // 5秒超时
        });
        const duration = Date.now() - start;
        
        // 简单的网络质量评估
        const isGoodConnection = response.ok && duration < 2000;
        // 减少网络质量检测的日志频率，只在质量差时输出
        if (!isGoodConnection) {
          console.log(`[sync] 网络质量检测: 较差 (${duration}ms)`);
        }
        return isGoodConnection;
      } catch (error) {
        console.warn('[sync] 网络质量检测失败:', error);
        return false;
      }
    };
    
    // 智能同步：只在网络质量良好时进行，并且避免频繁触发
    const intelligentSync = async () => {
      // 检查是否需要同步（有待同步的数据）
      const outbox = loadOutbox(onlineUserId);
      if (outbox.length === 0) {
        return; // 没有待同步数据，跳过
      }
      
      const isGoodNetwork = await checkNetworkQuality();
      if (isGoodNetwork) {
        flush();
      } else {
        console.log('[sync] 网络质量不佳，延迟同步');
      }
    };
    
    window.addEventListener('online', onOnline);
    
    // 延迟执行初次同步，避免页面加载时立即执行
    const initialSyncTimer = setTimeout(intelligentSync, 2000);
    
    return () => {
      window.removeEventListener('online', onOnline);
      clearTimeout(initialSyncTimer);
    };
  }, [onlineUserId, debouncedFlush, flush]);

  // 删除云端未完成记录
  const deleteIncompleteRecord = useCallback(async (clientId: string) => {
    if (!onlineUserId) {
      console.warn('[sync] 未登录，无法删除云端未完成记录');
      return;
    }
    
    try {
      await deleteIncompleteHistoryRecord(onlineUserId, clientId);
      console.log(`[sync] 云端未完成记录删除成功: ${clientId}`);
    } catch (error) {
      console.error(`[sync] 删除云端未完成记录失败:`, error);
      logSyncError(`删除云端未完成记录失败`, {
        clientId,
        error: error instanceof Error ? error.message : '删除失败'
      }, onlineUserId, clientId);
    }
  }, [onlineUserId]);

  return {
    enqueueRecord,
    enqueueBatch,
    flush,
    deleteIncompleteRecord,
    syncing,
    lastSyncAt,
    lastError, // 新增：错误状态
    // 错误日志和监控相关
    getErrorStats: () => errorLogger.getErrorStats(),
    getSyncMetrics: () => errorLogger.getSyncMetrics(),
    getHealthScore: () => errorLogger.getHealthScore(),
    exportLogs: () => errorLogger.exportLogs(),
    cleanupLogs: (days?: number) => errorLogger.cleanup(days),
  };
}


