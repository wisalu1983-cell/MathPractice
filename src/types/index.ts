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

// 用户管理相关类型
export interface UserManager {
  currentUser: User | null;
  users: User[];
}

export type UserAction = 'login' | 'register' | 'switch' | 'viewHistory';