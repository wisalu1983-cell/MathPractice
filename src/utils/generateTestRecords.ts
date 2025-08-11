import { GameSession, ProblemType, Difficulty, Problem } from '../types';
import { generateProblems } from './problemGenerator';

// 生成一个模拟的答题记录
const generateMockSession = (
  problemType: ProblemType,
  difficulty: Difficulty,
  correctRate: number,
  averageTimePerQuestion: number,
  recordDate: Date
): GameSession => {
  const problems = generateProblems(problemType, difficulty);
  const totalProblems = problems.length;
  const correctAnswers = Math.round(totalProblems * correctRate);
  const totalTime = totalProblems * averageTimePerQuestion;

  // 生成答案和时间记录
  const answers: (string | number)[] = [];
  const answerTimes: number[] = [];
  const problemStartTimes: number[] = [];

  problems.forEach((problem: Problem, index: number) => {
    // 根据正确率决定是否答对这道题
    const shouldBeCorrect = index < correctAnswers;
    
    if (shouldBeCorrect) {
      // 如果是正确答案
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
      // 如果是错误答案，生成一个接近但不等于正确答案的值
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
    const variance = averageTimePerQuestion * 0.3;
    const timeSpent = Math.max(
      1,
      Math.round(averageTimePerQuestion + (Math.random() * variance * 2 - variance))
    );
    answerTimes.push(timeSpent);

    // 生成题目开始时间，基于传入的日期
    const problemStartTime = recordDate.getTime() - (totalProblems - index) * averageTimePerQuestion * 1000;
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
  };
};

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

// 生成一组测试记录（带进度回调）
export const generateTestRecords = async (
  userId: string, 
  saveRecords: (sessions: GameSession[], userId: string) => string[],
  recordsPerType: number = 10,
  onProgress?: (current: number, total: number, currentType: string, currentDifficulty: string) => void
) => {
  const problemTypes: ProblemType[] = ['mental', 'written', 'mixed', 'properties'];
  const allSessions: GameSession[] = [];
  const totalRecords = problemTypes.length * recordsPerType;
  let generatedCount = 0;

  // 以“从今天开始，每天2条（基础+挑战）”的时间规则生成
  // 对每种题型生成指定数量的记录
  for (let typeIndex = 0; typeIndex < problemTypes.length; typeIndex++) {
    const type = problemTypes[typeIndex];

    // 基础与挑战数量（向上取整，保证总数 = recordsPerType）
    let basicRemaining = Math.ceil(recordsPerType / 2);
    let challengeRemaining = recordsPerType - basicRemaining;

    // 需要的天数：每天最多2条
    const daysNeeded = Math.ceil(recordsPerType / 2);

    // 按天生成：第0天为今天，1为昨天...
    for (let dayIndex = 0; dayIndex < daysNeeded; dayIndex++) {
      // 计算当天的日期（本地时区），并固定两个时间段：10:00 与 18:00
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);
      baseDate.setDate(baseDate.getDate() - dayIndex);

      const makeTime = (hour: number, minuteJitter: number) => {
        const d = new Date(baseDate);
        // 在目标小时附近加入轻微抖动，避免完全相同
        const minuteOffset = Math.floor((Math.random() - 0.5) * minuteJitter);
        d.setHours(hour, Math.max(0, Math.min(59, 30 + minuteOffset)), Math.floor(Math.random() * 60), Math.floor(Math.random() * 1000));
        return d;
      };

      // 当天第1条：优先基础
      if (basicRemaining > 0) {
        onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '基础难度');

        const correctRate = 0.5 + (Math.random() * 0.5);
        let averageTime;
        switch (type) {
          case 'mental':
            averageTime = 5 + Math.random() * 8; // 5-13秒
            break;
          case 'written':
            averageTime = 12 + Math.random() * 13; // 12-25秒
            break;
          default:
            averageTime = 8 + Math.random() * 10; // 8-18秒
        }

        const date1 = makeTime(10, 20);
        const session1 = generateMockSession(type, 'basic', correctRate, averageTime, date1);
        allSessions.push(session1);
        basicRemaining--;
        generatedCount++;
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 60));
      }

      // 当天第2条：优先挑战
      if (challengeRemaining > 0 && generatedCount < (typeIndex + 1) * recordsPerType) {
        onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '挑战难度');

        const correctRate = 0.3 + (Math.random() * 0.6);
        let averageTime;
        switch (type) {
          case 'mental':
            averageTime = 8 + Math.random() * 12; // 8-20秒
            break;
          case 'written':
            averageTime = 15 + Math.random() * 20; // 15-35秒
            break;
          default:
            averageTime = 12 + Math.random() * 13; // 12-25秒
        }

        const date2 = makeTime(18, 20);
        const session2 = generateMockSession(type, 'challenge', correctRate, averageTime, date2);
        allSessions.push(session2);
        challengeRemaining--;
        generatedCount++;
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 60));
      }
    }
  }

  // 最终进度更新
  onProgress?.(totalRecords, totalRecords, '完成', '正在保存...');

  // 按时间排序（最新的在前）
  allSessions.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

  // 批量保存所有记录
  return saveRecords(allSessions, userId);
};

// 生成一个“未完成”的模拟答题记录
const generateMockIncompleteSession = (
  problemType: ProblemType,
  difficulty: Difficulty,
  correctRate: number,
  averageTimePerQuestion: number,
  recordDate: Date,
  sessionId: string
): GameSession => {
  const problems = generateProblems(problemType, difficulty);
  const totalProblems = problems.length;

  // 答过的题数：至少1道，最多 totalProblems - 1 道
  const answeredCount = Math.max(1, Math.min(totalProblems - 1, Math.floor(totalProblems * (0.3 + Math.random() * 0.5))));

  const answers: (string | number)[] = new Array(totalProblems);
  const answerTimes: number[] = new Array(totalProblems);
  const problemStartTimes: number[] = [];

  const totalTimeForAnswered = answeredCount * averageTimePerQuestion;
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

    const variance = averageTimePerQuestion * 0.3;
    const timeSpent = Math.max(1, Math.round(averageTimePerQuestion + (Math.random() * variance * 2 - variance)));
    answerTimes[index] = timeSpent;

    const problemStartTime = startTime + index * averageTimePerQuestion * 1000;
    problemStartTimes.push(problemStartTime);
  }

  const timeSpent = answerTimes.filter((t) => typeof t === 'number').reduce((s, t) => s + (t || 0), 0);
  const score = correctAnswers * 10;

  return {
    problems,
    currentProblem: problems[Math.max(0, answeredCount - 1)] || null,
    currentIndex: Math.max(0, answeredCount - 1),
    answers,
    answerTimes,
    score,
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

// 生成一组“未完成”的测试记录（与完成记录保持相同的日期分布：从今天起每天2条）
export const generateIncompleteTestRecords = async (
  userId: string,
  recordsPerType: number = 10,
  onProgress?: (current: number, total: number, currentType: string, currentDifficulty: string) => void
) => {
  const problemTypes: ProblemType[] = ['mental', 'written', 'mixed', 'properties'];
  const allSessions: { session: GameSession; scheduledDate: Date }[] = [];
  const totalRecords = problemTypes.length * recordsPerType;
  let generatedCount = 0;

  for (let typeIndex = 0; typeIndex < problemTypes.length; typeIndex++) {
    const type = problemTypes[typeIndex];

    let basicRemaining = Math.ceil(recordsPerType / 2);
    let challengeRemaining = recordsPerType - basicRemaining;
    const daysNeeded = Math.ceil(recordsPerType / 2);

    const makeTime = (baseDate: Date, hour: number, minuteJitter: number) => {
      const d = new Date(baseDate);
      const minuteOffset = Math.floor((Math.random() - 0.5) * minuteJitter);
      d.setHours(hour, Math.max(0, Math.min(59, 30 + minuteOffset)), Math.floor(Math.random() * 60), Math.floor(Math.random() * 1000));
      return d;
    };

    for (let dayIndex = 0; dayIndex < daysNeeded; dayIndex++) {
      const baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);
      baseDate.setDate(baseDate.getDate() - dayIndex);

      if (basicRemaining > 0) {
        onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '基础难度');
        const correctRate = 0.5 + (Math.random() * 0.5);
        let averageTime;
        switch (type) {
          case 'mental':
            averageTime = 5 + Math.random() * 8;
            break;
          case 'written':
            averageTime = 12 + Math.random() * 13;
            break;
          default:
            averageTime = 8 + Math.random() * 10;
        }
        const date1 = makeTime(baseDate, 10, 20);
        const sessionId1 = `${type}_basic_${date1.getTime()}_${Math.random().toString(36).slice(2,6)}`;
        const session1 = generateMockIncompleteSession(type, 'basic', correctRate, averageTime, date1, sessionId1);
        allSessions.push({ session: session1, scheduledDate: date1 });
        basicRemaining--;
        generatedCount++;
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40));
      }

      if (challengeRemaining > 0 && generatedCount < (typeIndex + 1) * recordsPerType) {
        onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '挑战难度');
        const correctRate = 0.3 + (Math.random() * 0.6);
        let averageTime;
        switch (type) {
          case 'mental':
            averageTime = 8 + Math.random() * 12;
            break;
          case 'written':
            averageTime = 15 + Math.random() * 20;
            break;
          default:
            averageTime = 12 + Math.random() * 13;
        }
        const date2 = makeTime(baseDate, 18, 20);
        const sessionId2 = `${type}_challenge_${date2.getTime()}_${Math.random().toString(36).slice(2,6)}`;
        const session2 = generateMockIncompleteSession(type, 'challenge', correctRate, averageTime, date2, sessionId2);
        allSessions.push({ session: session2, scheduledDate: date2 });
        challengeRemaining--;
        generatedCount++;
        await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 40));
      }
    }
  }

  // 返回供调用方保存的会话及其计划日期
  // 由调用方逐条调用 upsertIncompleteRecord(session, userId, scheduledDate.getTime())
  return allSessions;
};