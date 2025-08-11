export type ProblemType = 'mental' | 'written' | 'mixed' | 'properties';
export type Difficulty = 'basic' | 'challenge';

export interface Problem {
  id: string;
  type: ProblemType;
  difficulty: Difficulty;
  question: string;
  answer: number | string;
  explanation?: string;
  steps?: string[];
  isMultipleChoice?: boolean;
  choices?: string[];
  correctChoice?: number;
  isDivision?: boolean;
  quotient?: number;
  remainder?: number;
}

export interface GameSession {
  currentProblem: Problem | null;
  problems: Problem[];
  currentIndex: number;
  answers: (string | number)[];
  answerTimes: number[];
  score: number;
  totalProblems: number;
  correctAnswers: number;
  isActive: boolean;
  isCompleted: boolean;
  sessionId: string;
  startTime: number;
  endTime?: number;
  problemType?: ProblemType;
  difficulty?: Difficulty;
  problemStartTimes: number[];
}

export interface ProblemTypeConfig {
  type: ProblemType;
  name: string;
  description: string;
  icon: string;
  color: string;
  count: number;
}

// 用户相关类型
export interface User {
  id: string;
  name: string;
  createdAt: number;
  lastLoginAt: number;
  isDeveloper?: boolean; // 开发者标识
}

// 历史记录类型
export interface HistoryRecord {
  id: string;
  userId: string;
  date: number;
  problemType: ProblemType;
  difficulty: Difficulty;
  totalProblems: number;
  correctAnswers: number;
  accuracy: number;
  totalTime: number;
  averageTime: number;
  problems: Problem[];
  answers: (string | number)[];
  answerTimes: number[];
  score: number;
}

// 未完成记录：与 HistoryRecord 结构基本一致，但含有 sessionId 以及 plannedTotalProblems，
// totalProblems 表示“已作答题数”，用于沿用现有统计/筛选逻辑。
export interface IncompleteHistoryRecord {
  id: string; // 一般与 sessionId 相同，便于去重/更新
  sessionId: string;
  userId: string;
  date: number; // 最后一次更新进度的时间戳
  problemType: ProblemType;
  difficulty: Difficulty;
  totalProblems: number; // 已作答题数
  correctAnswers: number;
  accuracy: number; // 基于已作答题数计算
  totalTime: number; // 已作答题的用时总和（基于 answerTimes）
  averageTime: number; // totalTime / totalProblems（若 totalProblems>0）
  problems: Problem[];
  answers: (string | number)[];
  answerTimes: number[];
  score: number; // 当前累计得分
  plannedTotalProblems: number; // 本次计划的总题数
}

// 用户管理相关类型
export interface UserManager {
  currentUser: User | null;
  users: User[];
}

export type UserAction = 'login' | 'register' | 'switch' | 'viewHistory';