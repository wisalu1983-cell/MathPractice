// 数据库类型定义，与 Supabase 表结构对应

import { ProblemType, Difficulty } from './index';

// profiles 表对应的类型
export interface Profile {
  user_id: string;
  name: string;
  created_at: string;
  last_login_at: string;
  is_developer: boolean;
}

// history_records 表对应的类型
export interface HistoryRecord {
  id: string;
  user_id: string;
  date: string;
  problem_type: ProblemType;
  difficulty: Difficulty;
  total_problems: number;
  correct_answers: number;
  accuracy: number;
  total_time: number;
  average_time: number;
  problems: any[]; // 存储 Problem[] 的 JSON
  answers: any[]; // 存储 (string|number)[] 的 JSON
  answer_times: number[]; // 存储 number[] 的 JSON
  score: number;
  client_id: string | null; // 去重键
}

export interface IncompleteHistoryRecord {
  id: string;
  user_id: string;
  date: string;
  problem_type: ProblemType;
  difficulty: Difficulty;
  total_problems: number; // 已作答题数
  correct_answers: number;
  accuracy: number;
  total_time: number;
  average_time: number;
  problems: any[];
  answers: any[];
  answer_times: number[];
  score: number;
  planned_total_problems: number; // 计划总题数
  client_id: string | null;
}

// Supabase 数据库的完整类型定义
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'user_id'>>;
      };
      history_records: {
        Row: HistoryRecord;
        Insert: Omit<HistoryRecord, 'id' | 'date'> & { 
          id?: string; 
          date?: string; 
        };
        Update: Partial<Omit<HistoryRecord, 'id' | 'user_id'>>;
      };
      incomplete_history_records: {
        Row: IncompleteHistoryRecord;
        Insert: Omit<IncompleteHistoryRecord, 'id' | 'date'> & {
          id?: string;
          date?: string;
        };
        Update: Partial<Omit<IncompleteHistoryRecord, 'id' | 'user_id'>>;
      };
    };
  };
}
