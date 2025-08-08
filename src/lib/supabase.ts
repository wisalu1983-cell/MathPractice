import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('请确保在 .env 文件中设置了 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
}

// 创建带类型的 Supabase 客户端
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 导出类型定义
export type { User } from '@supabase/supabase-js';
export type { Profile, HistoryRecord } from '../types/supabase';
