import { useCallback, useEffect, useState, useRef } from 'react';
// Note: types from '../types' not needed here; keep hook focused on sync pipeline
import { saveHistoryRecord, pullAllHistoryRecords, saveIncompleteHistoryRecord } from '../services/history';
import { useHistoryManager } from './useHistoryManager';
import { 
  logSyncError, 
  logNetworkError, 
  logDataConflict, 
  logSyncSuccess, 
  logSyncFailure,
  errorLogger 
} from '../utils/errorLogging';

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
    if (!onlineUserId) return;
    const queue = loadOutbox(onlineUserId);
    const exists = queue.some(q => q.client_id === serverPayload.client_id);
    if (exists) return;
    queue.push({ client_id: serverPayload.client_id, payload: serverPayload, retry: 0 });
    saveOutbox(onlineUserId, queue);
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

  const flush = useCallback(async () => {
    if (!onlineUserId || syncing || !isOnline) return;
    
    const startTime = Date.now();
    
    // 清除之前的错误状态
    setLastError(null);
    setSyncing(true);
    
    // 设置超时保护
    const timeoutPromise = new Promise((_, reject) => {
      syncTimeoutRef.current = setTimeout(() => {
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
      
      logSyncSuccess(`同步操作成功完成`, duration, {
        userId: onlineUserId,
        timestamp: Date.now()
      });
      
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
  
  // 实际的同步操作逻辑
  const syncOperation = async (userId: string, historyManager: any) => {
    // push 阶段
    const queue = loadOutbox(userId);
    if (queue.length > 0) {
      console.log('[sync] pushing', queue.length, 'items');
    }
    
    const nextQueue: PendingItem[] = [];
    let successCount = 0;
    
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
    
    // pull 阶段
    try {
      const server = await pullAllHistoryRecords(userId);
      historyManager.mergeServerRecords(server as any, userId);
      console.log('[sync] pull completed successfully');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '下载失败';
      
      logSyncError(`从服务器拉取数据失败`, {
        error: errorMessage,
        userId: userId
      }, userId);
      
      throw e; // 重新抛出错误，让上层处理
    }
    
    console.log(`[sync] 同步完成，成功上传 ${successCount} 项，队列剩余 ${nextQueue.length} 项`);
    
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
        const response = await fetch('/favicon.ico', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000) // 5秒超时
        });
        const duration = Date.now() - start;
        
        // 简单的网络质量评估
        const isGoodConnection = response.ok && duration < 2000;
        console.log(`[sync] 网络质量检测: ${isGoodConnection ? '良好' : '较差'} (${duration}ms)`);
        return isGoodConnection;
      } catch (error) {
        console.warn('[sync] 网络质量检测失败:', error);
        return false;
      }
    };
    
    // 智能同步：只在网络质量良好时进行
    const intelligentSync = async () => {
      const isGoodNetwork = await checkNetworkQuality();
      if (isGoodNetwork) {
        flush();
      } else {
        console.log('[sync] 网络质量不佳，延迟同步');
        // 可以在这里设置延迟重试
      }
    };
    
    window.addEventListener('online', onOnline);
    
    // 初次登录/挂载时触发智能同步
    intelligentSync();
    
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [onlineUserId, debouncedFlush, flush]);

  return {
    enqueueRecord,
    enqueueBatch,
    flush,
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


