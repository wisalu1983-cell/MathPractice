import { useCallback, useEffect, useState } from 'react';
// Note: types from '../types' not needed here; keep hook focused on sync pipeline
import { saveHistoryRecord, pullAllHistoryRecords, saveIncompleteHistoryRecord } from '../services/history';
import { useHistoryManager } from './useHistoryManager';

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
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  // 注意：不要在此 hook 内部创建新的 history 管理实例，避免引用变动导致 flush 依赖抖动
  // 在当前实现中，为保持简单仍引用一次，但我们不会把 history 放入 flush 的依赖数组，避免每次渲染重建回调
  const history = useHistoryManager();

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
    setSyncing(true);
    try {
      // push
      const queue = loadOutbox(onlineUserId);
      if (queue.length > 0) {
        // 调试日志
        // eslint-disable-next-line no-console
        console.log('[sync] pushing', queue.length, 'items');
      }
      const nextQueue: PendingItem[] = [];
      for (const item of queue) {
        try {
          // eslint-disable-next-line no-console
          console.log('[sync] upsert payload', item.payload);
          if (item.payload && item.payload.planned_total_problems) {
            await saveIncompleteHistoryRecord(onlineUserId, item.payload);
          } else {
            await saveHistoryRecord(onlineUserId, item.payload);
          }
          // eslint-disable-next-line no-console
          console.log('[sync] upsert ok for', item.client_id);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[sync] upsert failed for', item.client_id, e);
          item.retry += 1;
          nextQueue.push(item); // 仅失败的留下重试
        }
      }
      // 只保存失败队列，成功的从队列中移除；并在保存时应用上限裁剪
      saveOutbox(onlineUserId, nextQueue);

      // pull 全量（简单实现）
      try {
        const server = await pullAllHistoryRecords(onlineUserId);
        // 合并到本地
        history.mergeServerRecords(server as any, onlineUserId);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[sync] pull failed', e);
      }
      // 仅当本次 flush 实际完成一次 push/pull 流程后更新
      setLastSyncAt(Date.now());
    } finally {
      setSyncing(false);
    }
  // 重要：不把 history 放进依赖，避免其引用变化触发 flush 重建
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUserId, syncing, isOnline]);

  useEffect(() => {
    if (!onlineUserId) return;
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    // 初次登录/挂载时仅触发一次
    flush();
    return () => window.removeEventListener('online', onOnline);
  }, [onlineUserId]);

  return {
    enqueueRecord,
    enqueueBatch,
    flush,
    syncing,
    lastSyncAt,
  };
}


