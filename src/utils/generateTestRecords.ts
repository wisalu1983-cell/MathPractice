import { GameSession, ProblemType, Difficulty, Problem } from '../types';
import { generateProblems } from './problemGenerator';

// 测试数据生成配置
export interface TestDataConfig {
  problemTypes: ProblemType[];
  difficulties: Difficulty[];
  recordType: 'completed' | 'incomplete' | 'both';
  recordsPerCombination: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  performanceRange: {
    minAccuracy: number;
    maxAccuracy: number;
    minAvgTime: number;
    maxAvgTime: number;
  };
  distributionPattern: 'random' | 'daily' | 'weekly';
}

// 默认配置
export const DEFAULT_TEST_CONFIG: TestDataConfig = {
  problemTypes: ['mental', 'written', 'mixed', 'properties'],
  difficulties: ['basic', 'challenge'],
  recordType: 'completed',
  recordsPerCombination: 5,
  dateRange: {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
    endDate: new Date()
  },
  performanceRange: {
    minAccuracy: 60,
    maxAccuracy: 95,
    minAvgTime: 15,
    maxAvgTime: 45
  },
  distributionPattern: 'daily'
};

// 生成进度回调类型
export interface GenerationProgress {
  current: number;
  total: number;
  stage: string;
  details: string;
  percentage: number;
}

// 生成结果类型
export interface GenerationResult {
  success: boolean;
  completedRecords: string[];
  incompleteRecords: string[];
  errors: string[];
  totalGenerated: number;
  syncResult?: {
    success: boolean;
    message: string;
  };
}

// 清空结果类型
export interface ClearResult {
  success: boolean;
  clearedCompletedCount: number;
  clearedIncompleteCount: number;
  errors: string[];
  syncResult?: {
    success: boolean;
    message: string;
  };
}

// 获取题型的中文名称
const getTypeNameInChinese = (type: ProblemType): string => {
  const typeNames = {
    'mental': '口算',
    'written': '笔算',
    'mixed': '多步复合算式',
    'properties': '运算律与规则'
  };
  return typeNames[type];
};

// 获取难度的中文名称
const getDifficultyNameInChinese = (difficulty: Difficulty): string => {
  return difficulty === 'basic' ? '基础' : '挑战';
};

// 生成随机日期
const generateRandomDate = (startDate: Date, endDate: Date): Date => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
};

// 生成按天分布的日期
const generateDailyDistributedDates = (
  startDate: Date,
  endDate: Date,
  totalRecords: number
): Date[] => {
  const dates: Date[] = [];
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const recordsPerDay = Math.ceil(totalRecords / daysDiff);
  
  for (let i = 0; i < totalRecords; i++) {
    const dayIndex = Math.floor(i / recordsPerDay);
    const baseDate = new Date(startDate);
    baseDate.setDate(baseDate.getDate() + dayIndex);
    
    // 随机时间段
    const hour = 8 + Math.random() * 12; // 8-20点之间
    const minute = Math.random() * 60;
    baseDate.setHours(Math.floor(hour), Math.floor(minute));
    
    dates.push(baseDate);
  }
  
  return dates.sort((a, b) => b.getTime() - a.getTime()); // 最新的在前
};

// 生成一个模拟的完成答题记录
const generateCompletedSession = (
  problemType: ProblemType,
  difficulty: Difficulty,
  recordDate: Date,
  performanceRange: TestDataConfig['performanceRange']
): GameSession => {
  const problems = generateProblems(problemType, difficulty);
  const totalProblems = problems.length;
  
  // 随机生成正确率
  const correctRate = (performanceRange.minAccuracy + 
    Math.random() * (performanceRange.maxAccuracy - performanceRange.minAccuracy)) / 100;
  const correctAnswers = Math.round(totalProblems * correctRate);
  
  // 随机生成平均答题时间
  const averageTime = performanceRange.minAvgTime + 
    Math.random() * (performanceRange.maxAvgTime - performanceRange.minAvgTime);
  const totalTime = totalProblems * averageTime;

  // 生成答案和时间记录
  const answers: (string | number)[] = [];
  const answerTimes: number[] = [];
  const problemStartTimes: number[] = [];

  problems.forEach((problem: Problem, index: number) => {
    // 根据正确率决定是否答对这道题
    const shouldBeCorrect = index < correctAnswers;
    
    if (shouldBeCorrect) {
      // 生成正确答案
      if (problem.isMultipleChoice) {
        answers.push(problem.correctChoice!);
      } else if (problem.isDivision) {
        if (problem.remainder === 0) {
          answers.push(problem.quotient!.toString());
        } else {
          answers.push(`${problem.quotient}……${problem.remainder}`);
        }
      } else {
        answers.push(problem.answer);
      }
    } else {
      // 生成错误答案
      if (problem.isMultipleChoice) {
        const wrongChoice = (problem.correctChoice! + 1) % (problem.choices?.length || 4);
        answers.push(wrongChoice);
      } else if (problem.isDivision) {
        answers.push(`${problem.quotient! + 1}……${problem.remainder}`);
      } else {
        const numericAnswer = typeof problem.answer === 'number' 
          ? problem.answer 
          : parseInt(problem.answer.toString());
        answers.push(numericAnswer + (Math.random() < 0.5 ? 1 : -1));
      }
    }

    // 生成随机答题时间（在平均时间基础上上下浮动30%）
    const variance = averageTime * 0.3;
    const timeSpent = Math.max(
      1,
      Math.round(averageTime + (Math.random() * variance * 2 - variance))
    );
    answerTimes.push(timeSpent);

    // 生成题目开始时间
    const problemStartTime = recordDate.getTime() - (totalProblems - index) * averageTime * 1000;
    problemStartTimes.push(problemStartTime);
  });

  // 设置开始和结束时间
  const endTime = recordDate.getTime();
  const startTime = endTime - totalTime * 1000;

  return {
    problems,
    currentProblem: null,
    currentIndex: totalProblems - 1,
    answers,
    answerTimes,
    score: correctAnswers * 10,
    totalProblems,
    correctAnswers,
    isActive: false,
    isCompleted: true,
    startTime,
    endTime,
    problemType,
    difficulty,
    problemStartTimes,
    sessionId: `${problemType}_${difficulty}_${recordDate.getTime()}_${Math.random().toString(36).slice(2, 8)}`
  };
};

// 生成一个模拟的未完成答题记录
const generateIncompleteSession = (
  problemType: ProblemType,
  difficulty: Difficulty,
  recordDate: Date,
  performanceRange: TestDataConfig['performanceRange']
): GameSession => {
  const problems = generateProblems(problemType, difficulty);
  const totalProblems = problems.length;
  
  // 未完成记录：答过的题数在30%-80%之间
  const answeredCount = Math.max(1, Math.min(
    totalProblems - 1, 
    Math.floor(totalProblems * (0.3 + Math.random() * 0.5))
  ));

  // 随机生成正确率
  const correctRate = (performanceRange.minAccuracy + 
    Math.random() * (performanceRange.maxAccuracy - performanceRange.minAccuracy)) / 100;
  
  // 随机生成平均答题时间
  const averageTime = performanceRange.minAvgTime + 
    Math.random() * (performanceRange.maxAvgTime - performanceRange.minAvgTime);

  const answers: (string | number)[] = new Array(totalProblems);
  const answerTimes: number[] = new Array(totalProblems);
  const problemStartTimes: number[] = [];

  const totalTimeForAnswered = answeredCount * averageTime;
  const startTime = recordDate.getTime() - totalTimeForAnswered * 1000;

  let correctAnswers = 0;

  for (let index = 0; index < answeredCount; index++) {
    const problem = problems[index];
    const shouldBeCorrect = Math.random() < correctRate;

    if (shouldBeCorrect) {
      if (problem.isMultipleChoice) {
        answers[index] = problem.correctChoice!;
      } else if (problem.isDivision) {
        if (problem.remainder === 0) {
          answers[index] = problem.quotient!.toString();
        } else {
          answers[index] = `${problem.quotient}……${problem.remainder}`;
        }
      } else {
        answers[index] = problem.answer;
      }
      correctAnswers += 1;
    } else {
      if (problem.isMultipleChoice) {
        const wrongChoice = (problem.correctChoice! + 1) % (problem.choices?.length || 4);
        answers[index] = wrongChoice;
      } else if (problem.isDivision) {
        answers[index] = `${(problem.quotient || 0) + 1}……${problem.remainder || 0}`;
      } else {
        const numericAnswer = typeof problem.answer === 'number' 
          ? problem.answer 
          : parseInt(problem.answer.toString());
        answers[index] = numericAnswer + (Math.random() < 0.5 ? 1 : -1);
      }
    }

    const variance = averageTime * 0.3;
    const timeSpent = Math.max(1, Math.round(averageTime + (Math.random() * variance * 2 - variance)));
    answerTimes[index] = timeSpent;

    const problemStartTime = startTime + index * averageTime * 1000;
    problemStartTimes.push(problemStartTime);
  }

  const sessionId = `${problemType}_${difficulty}_${recordDate.getTime()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    problems,
    currentProblem: problems[Math.max(0, answeredCount - 1)] || null,
    currentIndex: Math.max(0, answeredCount - 1),
    answers,
    answerTimes,
    score: correctAnswers * 10,
    totalProblems,
    correctAnswers,
    isActive: true,
    isCompleted: false,
    sessionId,
    startTime,
    // 无 endTime（未完成）
    problemType,
    difficulty,
    problemStartTimes,
  };
};

// 生成测试数据的主函数
export const generateTestData = async (
  userId: string,
  config: TestDataConfig,
  saveCompleted: (sessions: GameSession[], userId: string) => string[],
  saveIncomplete: (session: GameSession, userId: string, overrideDate?: number) => boolean,
  triggerSync?: () => Promise<{ success: boolean; message: string }>,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GenerationResult> => {
  const result: GenerationResult = {
    success: false,
    completedRecords: [],
    incompleteRecords: [],
    errors: [],
    totalGenerated: 0
  };

  try {
    // 计算总数
    const combinations = config.problemTypes.length * config.difficulties.length;
    let totalRecords = 0;
    
    if (config.recordType === 'completed' || config.recordType === 'both') {
      totalRecords += combinations * config.recordsPerCombination;
    }
    if (config.recordType === 'incomplete' || config.recordType === 'both') {
      totalRecords += combinations * config.recordsPerCombination;
    }

    let currentRecord = 0;

    // 生成已完成记录
    if (config.recordType === 'completed' || config.recordType === 'both') {
      onProgress?.({
        current: currentRecord,
        total: totalRecords,
        stage: '生成已完成记录',
        details: '正在准备...',
        percentage: 0
      });

      const completedSessions: GameSession[] = [];
      
      for (const problemType of config.problemTypes) {
        for (const difficulty of config.difficulties) {
          const typeName = getTypeNameInChinese(problemType);
          const difficultyName = getDifficultyNameInChinese(difficulty);
          
          // 生成日期列表
          const dates = config.distributionPattern === 'daily' 
            ? generateDailyDistributedDates(
                config.dateRange.startDate, 
                config.dateRange.endDate, 
                config.recordsPerCombination
              )
            : Array.from({ length: config.recordsPerCombination }, () => 
                generateRandomDate(config.dateRange.startDate, config.dateRange.endDate)
              );

          for (let i = 0; i < config.recordsPerCombination; i++) {
            onProgress?.({
              current: currentRecord,
              total: totalRecords,
              stage: '生成已完成记录',
              details: `${typeName} - ${difficultyName} (${i + 1}/${config.recordsPerCombination})`,
              percentage: Math.round((currentRecord / totalRecords) * 100)
            });

            const session = generateCompletedSession(
              problemType,
              difficulty,
              dates[i],
              config.performanceRange
            );
            completedSessions.push(session);
            currentRecord++;
            
            // 添加小延迟避免界面卡顿
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }

      // 保存已完成记录
      onProgress?.({
        current: currentRecord,
        total: totalRecords,
        stage: '保存已完成记录',
        details: '正在保存到本地存储...',
        percentage: Math.round((currentRecord / totalRecords) * 100)
      });

      try {
        result.completedRecords = saveCompleted(completedSessions, userId);
      } catch (error) {
        result.errors.push(`保存已完成记录失败: ${error}`);
      }
    }

    // 生成未完成记录
    if (config.recordType === 'incomplete' || config.recordType === 'both') {
      onProgress?.({
        current: currentRecord,
        total: totalRecords,
        stage: '生成未完成记录',
        details: '正在准备...',
        percentage: Math.round((currentRecord / totalRecords) * 100)
      });

      for (const problemType of config.problemTypes) {
        for (const difficulty of config.difficulties) {
          const typeName = getTypeNameInChinese(problemType);
          const difficultyName = getDifficultyNameInChinese(difficulty);
          
          // 生成日期列表
          const dates = config.distributionPattern === 'daily' 
            ? generateDailyDistributedDates(
                config.dateRange.startDate, 
                config.dateRange.endDate, 
                config.recordsPerCombination
              )
            : Array.from({ length: config.recordsPerCombination }, () => 
                generateRandomDate(config.dateRange.startDate, config.dateRange.endDate)
              );

          for (let i = 0; i < config.recordsPerCombination; i++) {
            onProgress?.({
              current: currentRecord,
              total: totalRecords,
              stage: '生成未完成记录',
              details: `${typeName} - ${difficultyName} (${i + 1}/${config.recordsPerCombination})`,
              percentage: Math.round((currentRecord / totalRecords) * 100)
            });

            const session = generateIncompleteSession(
              problemType,
              difficulty,
              dates[i],
              config.performanceRange
            );

            try {
              const success = saveIncomplete(session, userId, dates[i].getTime());
              if (success) {
                result.incompleteRecords.push(session.sessionId);
              } else {
                result.errors.push(`保存未完成记录失败: ${session.sessionId}`);
              }
            } catch (error) {
              result.errors.push(`保存未完成记录失败: ${error}`);
            }

            currentRecord++;
            
            // 添加小延迟避免界面卡顿
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
    }

    result.totalGenerated = currentRecord;

    // 触发同步
    if (triggerSync) {
      onProgress?.({
        current: totalRecords,
        total: totalRecords,
        stage: '同步到云端',
        details: '正在同步数据...',
        percentage: 100
      });

      try {
        result.syncResult = await triggerSync();
      } catch (error) {
        result.syncResult = {
          success: false,
          message: `同步失败: ${error}`
        };
      }
    }

    result.success = result.errors.length === 0;

    onProgress?.({
      current: totalRecords,
      total: totalRecords,
      stage: '完成',
      details: result.success ? '生成完成' : '生成完成，但有部分错误',
      percentage: 100
    });

  } catch (error) {
    result.errors.push(`生成过程出错: ${error}`);
    result.success = false;
  }

  return result;
};

// 清空测试数据的函数
export const clearTestData = async (
  userId: string,
  recordType: 'completed' | 'incomplete' | 'both',
  clearCompleted: (userId: string) => boolean,
  clearIncomplete: (userId: string) => boolean,
  triggerSync?: () => Promise<{ success: boolean; message: string }>,
  onProgress?: (progress: GenerationProgress) => void
): Promise<ClearResult> => {
  const result: ClearResult = {
    success: false,
    clearedCompletedCount: 0,
    clearedIncompleteCount: 0,
    errors: []
  };

  try {
    // 清空已完成记录
    if (recordType === 'completed' || recordType === 'both') {
      onProgress?.({
        current: 0,
        total: 100,
        stage: '清空已完成记录',
        details: '正在清空...',
        percentage: 25
      });

      try {
        const success = clearCompleted(userId);
        if (success) {
          result.clearedCompletedCount = 1; // 这里可以返回实际清空的数量
        } else {
          result.errors.push('清空已完成记录失败');
        }
      } catch (error) {
        result.errors.push(`清空已完成记录失败: ${error}`);
      }
    }

    // 清空未完成记录
    if (recordType === 'incomplete' || recordType === 'both') {
      onProgress?.({
        current: 0,
        total: 100,
        stage: '清空未完成记录',
        details: '正在清空...',
        percentage: 50
      });

      try {
        const success = clearIncomplete(userId);
        if (success) {
          result.clearedIncompleteCount = 1; // 这里可以返回实际清空的数量
        } else {
          result.errors.push('清空未完成记录失败');
        }
      } catch (error) {
        result.errors.push(`清空未完成记录失败: ${error}`);
      }
    }

    // 触发同步
    if (triggerSync) {
      onProgress?.({
        current: 0,
        total: 100,
        stage: '同步到云端',
        details: '正在同步清空操作...',
        percentage: 75
      });

      try {
        result.syncResult = await triggerSync();
      } catch (error) {
        result.syncResult = {
          success: false,
          message: `同步失败: ${error}`
        };
      }
    }

    result.success = result.errors.length === 0;

    onProgress?.({
      current: 100,
      total: 100,
      stage: '完成',
      details: result.success ? '清空完成' : '清空完成，但有部分错误',
      percentage: 100
    });

  } catch (error) {
    result.errors.push(`清空过程出错: ${error}`);
    result.success = false;
  }

  return result;
};