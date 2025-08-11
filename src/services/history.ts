import { supabase } from '../lib/supabase';
import type { HistoryRecord } from '../types/supabase';

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


