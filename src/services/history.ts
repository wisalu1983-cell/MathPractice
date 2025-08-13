import { supabase } from '../lib/supabase';
import type { HistoryRecord, IncompleteHistoryRecord } from '../types/supabase';

export async function saveHistoryRecord(
  userId: string,
  record: Omit<HistoryRecord, 'id' | 'user_id' | 'date'> & { date?: string }
) {
  const payload = {
    ...record,
    user_id: userId,
  } as const;

  const { data, error } = await supabase
    .from('history_records')
    .upsert(payload, { onConflict: 'user_id,client_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as HistoryRecord;
}

export async function listHistoryRecords(userId: string) {
  const { data, error } = await supabase
    .from('history_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as HistoryRecord[];
}

export async function pullAllHistoryRecords(userId: string) {
  return listHistoryRecords(userId);
}

// 未完成记录：上行保存到 incomplete_history_records 表（幂等：user_id+client_id）
export async function saveIncompleteHistoryRecord(
  userId: string,
  record: Omit<IncompleteHistoryRecord, 'id' | 'user_id' | 'date'> & { date?: string }
) {
  const payload = {
    ...record,
    user_id: userId,
  } as const;

  const { data, error } = await supabase
    .from('incomplete_history_records')
    .upsert(payload as any, { onConflict: 'user_id,client_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as IncompleteHistoryRecord;
}

export async function listIncompleteHistoryRecords(userId: string) {
  const { data, error } = await supabase
    .from('incomplete_history_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as IncompleteHistoryRecord[];
}


