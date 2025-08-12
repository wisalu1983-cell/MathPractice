import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameSession, HistoryRecord as LocalHistoryRecord } from '../types';
import { saveHistoryRecord, pullAllHistoryRecords } from '../services/history';
import { useHistoryManager } from './useHistoryManager';
import { supabase } from '../lib/supabase';

type PendingItem = {
  client_id: string;
  payload: any;
  retry: number;
};

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
  localStorage.setItem(key, JSON.stringify(items));
}

export function useSyncManager(onlineUserId: string | null) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
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
          await saveHistoryRecord(onlineUserId, item.payload);
          // eslint-disable-next-line no-console
          console.log('[sync] upsert ok for', item.client_id);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[sync] upsert failed for', item.client_id, e);
          item.retry += 1;
          nextQueue.push(item); // 仅失败的留下重试
        }
      }
      // 只保存失败队列，成功的从队列中移除
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
      setLastSyncAt(Date.now());
    } finally {
      setSyncing(false);
    }
  }, [onlineUserId, syncing, isOnline, history]);

  useEffect(() => {
    if (!onlineUserId) return;
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    flush();
    return () => window.removeEventListener('online', onOnline);
  }, [onlineUserId, flush]);

  return {
    enqueueRecord,
    enqueueBatch,
    flush,
    syncing,
    lastSyncAt,
  };
}


