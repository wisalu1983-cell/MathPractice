import { useCallback, useState, useEffect } from 'react';
import { HistoryRecord, GameSession } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const useHistoryManager = () => {
  const [historyRecords, setHistoryRecords] = useLocalStorage<HistoryRecord[]>('historyRecords', []);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 监听refreshTrigger变化，强制重新读取localStorage
  useEffect(() => {
    if (refreshTrigger > 0) {
      const storedRecords = localStorage.getItem('historyRecords');
      if (storedRecords) {
        try {
          const parsedRecords = JSON.parse(storedRecords);
          setHistoryRecords(parsedRecords);
        } catch (error) {
          console.error('Failed to refresh history records:', error);
        }
      }
    }
  }, [refreshTrigger, setHistoryRecords]);

  // 保存单条答题记录
  const saveRecord = useCallback((session: GameSession, userId: string): string => {
    if (!session.isCompleted || !userId) return '';

    const timeSpent = session.endTime && session.startTime 
      ? Math.round((session.endTime - session.startTime) / 1000) 
      : 0;

    const accuracy = session.totalProblems > 0 
      ? Math.round((session.correctAnswers / session.totalProblems) * 100) 
      : 0;

    const averageTime = session.totalProblems > 0 
      ? Math.round(timeSpent / session.totalProblems) 
      : 0;

    const record: HistoryRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      date: session.endTime || Date.now(),
      problemType: session.problemType!,
      difficulty: session.difficulty!,
      totalProblems: session.totalProblems,
      correctAnswers: session.correctAnswers,
      accuracy,
      totalTime: timeSpent,
      averageTime,
      problems: session.problems,
      answers: session.answers,
      answerTimes: session.answerTimes,
      score: session.score
    };

    setHistoryRecords(prev => [record, ...prev]);
    return record.id;
  }, [setHistoryRecords]);

  // 批量保存记录
  const saveRecords = useCallback((sessions: GameSession[], userId: string): string[] => {
    if (!userId || sessions.length === 0) return [];

    const newRecords: HistoryRecord[] = [];
    const recordIds: string[] = [];

    sessions.forEach(session => {
      if (!session.isCompleted) return;

      const timeSpent = session.endTime && session.startTime 
        ? Math.round((session.endTime - session.startTime) / 1000) 
        : 0;

      const accuracy = session.totalProblems > 0 
        ? Math.round((session.correctAnswers / session.totalProblems) * 100) 
        : 0;

      const averageTime = session.totalProblems > 0 
        ? Math.round(timeSpent / session.totalProblems) 
        : 0;

      const recordId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const record: HistoryRecord = {
        id: recordId,
        userId,
        date: session.endTime || Date.now(),
        problemType: session.problemType!,
        difficulty: session.difficulty!,
        totalProblems: session.totalProblems,
        correctAnswers: session.correctAnswers,
        accuracy,
        totalTime: timeSpent,
        averageTime,
        problems: session.problems,
        answers: session.answers,
        answerTimes: session.answerTimes,
        score: session.score
      };

      newRecords.push(record);
      recordIds.push(recordId);
    });

    // 一次性批量更新所有记录
    setHistoryRecords(prev => [...newRecords, ...prev]);
    return recordIds;
  }, [setHistoryRecords]);

  // 强制刷新历史记录（从localStorage重新读取）
  const refreshRecords = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    return true;
  }, []);

  // 获取用户的历史记录
  const getUserRecords = useCallback((userId: string): HistoryRecord[] => {
    return historyRecords
      .filter(record => record.userId === userId)
      .sort((a, b) => b.date - a.date); // 按时间降序排列
  }, [historyRecords]);

  // 根据ID获取特定记录
  const getRecordById = useCallback((recordId: string): HistoryRecord | null => {
    return historyRecords.find(record => record.id === recordId) || null;
  }, [historyRecords]);

  // 删除记录
  const deleteRecord = useCallback((recordId: string): boolean => {
    setHistoryRecords(prev => prev.filter(record => record.id !== recordId));
    return true;
  }, [setHistoryRecords]);

  // 清空用户的所有记录
  const clearUserRecords = useCallback((userId: string): boolean => {
    setHistoryRecords(prev => prev.filter(record => record.userId !== userId));
    return true;
  }, [setHistoryRecords]);

  // 获取用户统计信息
  const getUserStats = useCallback((userId: string) => {
    const userRecords = getUserRecords(userId);
    
    if (userRecords.length === 0) {
      return {
        totalSessions: 0,
        totalProblems: 0,
        totalCorrectAnswers: 0,
        averageAccuracy: 0,
        totalTimeSpent: 0,
        bestAccuracy: 0,
        recentSessions: []
      };
    }

    const totalSessions = userRecords.length;
    const totalProblems = userRecords.reduce((sum, record) => sum + record.totalProblems, 0);
    const totalCorrectAnswers = userRecords.reduce((sum, record) => sum + record.correctAnswers, 0);
    const averageAccuracy = totalProblems > 0 ? Math.round((totalCorrectAnswers / totalProblems) * 100) : 0;
    const totalTimeSpent = userRecords.reduce((sum, record) => sum + record.totalTime, 0);
    const bestAccuracy = Math.max(...userRecords.map(record => record.accuracy));
    const recentSessions = userRecords.slice(0, 5); // 最近5次

    return {
      totalSessions,
      totalProblems,
      totalCorrectAnswers,
      averageAccuracy,
      totalTimeSpent,
      bestAccuracy,
      recentSessions
    };
  }, [getUserRecords]);

  return {
    historyRecords,
    saveRecord,
    saveRecords,
    refreshRecords,
    getUserRecords,
    getRecordById,
    deleteRecord,
    clearUserRecords,
    getUserStats
  };
};