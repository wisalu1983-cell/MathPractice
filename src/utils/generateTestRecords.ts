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
  
  // 对每种题型生成指定数量的记录
  for (let typeIndex = 0; typeIndex < problemTypes.length; typeIndex++) {
    const type = problemTypes[typeIndex];
    // 确保基础和挑战难度的题目数量大致相等
    const basicCount = Math.ceil(recordsPerType / 2);
    const challengeCount = recordsPerType - basicCount;

    // 生成基础难度的记录
    for (let i = 0; i < basicCount; i++) {
      // 更新进度
      onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '基础难度');
      
      // 生成一个0.5到1.0之间的正确率（基础难度正确率较高）
      const correctRate = 0.5 + (Math.random() * 0.5);
      
      // 生成平均答题时间
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

      // 为每条记录生成一个随机的日期（分布在最近的时间范围内）
      const delay = Math.floor(Math.random() * 1000) + 500;
      const dayOffset = typeIndex * recordsPerType + i; // 确保不同题型的记录时间错开
      const dummyDate = new Date(Date.now() - dayOffset * 12 * 60 * 60 * 1000 - delay); // 每12小时一条记录
      
      const session = generateMockSession(type, 'basic', correctRate, averageTime, dummyDate);
      allSessions.push(session);
      generatedCount++;
      
      // 模拟异步生成过程
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // 生成挑战难度的记录
    for (let i = 0; i < challengeCount; i++) {
      // 更新进度
      onProgress?.(generatedCount, totalRecords, getTypeNameInChinese(type), '挑战难度');
      
      // 生成一个0.3到0.9之间的正确率（挑战难度正确率较低）
      const correctRate = 0.3 + (Math.random() * 0.6);
      
      // 生成平均答题时间（挑战难度用时较长）
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

      // 为每条记录生成一个随机的日期（错开基础难度的时间）
      const delay = Math.floor(Math.random() * 1000) + 500;
      const dayOffset = typeIndex * recordsPerType + basicCount + i;
      const dummyDate = new Date(Date.now() - dayOffset * 12 * 60 * 60 * 1000 - delay);
      
      const session = generateMockSession(type, 'challenge', correctRate, averageTime, dummyDate);
      allSessions.push(session);
      generatedCount++;
      
      // 模拟异步生成过程
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  }

  // 最终进度更新
  onProgress?.(totalRecords, totalRecords, '完成', '正在保存...');

  // 按时间排序（最新的在前）
  allSessions.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

  // 批量保存所有记录
  return saveRecords(allSessions, userId);
};