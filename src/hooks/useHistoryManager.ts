import { useCallback, useState, useEffect } from 'react';
import { HistoryRecord, GameSession, IncompleteHistoryRecord } from '../types';
import type { HistoryRecord as ServerHistoryRecord } from '../types/supabase';
import { useLocalStorage } from './useLocalStorage';

export const useHistoryManager = () => {
  const [historyRecords, setHistoryRecords] = useLocalStorage<HistoryRecord[]>('historyRecords', []);
  const [incompleteHistoryRecords, setIncompleteHistoryRecords] = useLocalStorage<IncompleteHistoryRecord[]>('incompleteHistoryRecords', []);
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

      const storedIncomplete = localStorage.getItem('incompleteHistoryRecords');
      if (storedIncomplete) {
        try {
          const parsedIncomplete = JSON.parse(storedIncomplete);
          setIncompleteHistoryRecords(parsedIncomplete);
        } catch (error) {
          console.error('Failed to refresh incomplete history records:', error);
        }
      }
    }
  }, [refreshTrigger, setHistoryRecords, setIncompleteHistoryRecords]);

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
    // 保存完成记录后，清除对应未完成记录
    if (session.sessionId) {
      setIncompleteHistoryRecords(prev => prev.filter(r => r.sessionId !== session.sessionId));
    }
    return record.id;
  }, [setHistoryRecords, setIncompleteHistoryRecords]);

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

  // 统计某个本地用户的完成记录数
  const getLocalRecordCount = useCallback((userId: string): number => {
    return historyRecords.filter(r => r.userId === userId).length;
  }, [historyRecords]);

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
    getUserStats,
    getLocalRecordCount,
    // 未完成记录相关
    incompleteHistoryRecords,
    upsertIncompleteRecord: (session: GameSession, userId: string, overrideDate?: number) => {
      if (!userId || !session.isActive || session.isCompleted) return false;
      if (!session.problemType || !session.difficulty) return false;

      // 统计已作答数量与时间
      const answeredCount = session.answers.filter(a => a !== undefined).length;
      const correctAnswers = session.correctAnswers;
      const accuracy = session.totalProblems > 0 && answeredCount > 0
        ? Math.round((correctAnswers / answeredCount) * 100)
        : 0;
      const totalTime = session.answerTimes.filter(t => typeof t === 'number').reduce((s, t) => s + (t || 0), 0);
      const averageTime = answeredCount > 0 ? Math.round(totalTime / answeredCount) : 0;

      const now = typeof overrideDate === 'number' ? overrideDate : Date.now();
      const record: IncompleteHistoryRecord = {
        id: session.sessionId || `${userId}_${now}`,
        sessionId: session.sessionId || `${userId}_${now}`,
        userId,
        date: now,
        problemType: session.problemType,
        difficulty: session.difficulty,
        totalProblems: answeredCount,
        correctAnswers,
        accuracy,
        totalTime,
        averageTime,
        problems: session.problems,
        answers: session.answers,
        answerTimes: session.answerTimes,
        score: session.score,
        plannedTotalProblems: session.totalProblems
      };

      setIncompleteHistoryRecords(prev => {
        const idx = prev.findIndex(r => r.sessionId === record.sessionId && r.userId === userId);
        if (idx >= 0) {
          const cloned = prev.slice();
          cloned[idx] = record;
          return cloned;
        }
        return [record, ...prev];
      });
      return true;
    },
    // 将服务器记录合并到本地（去重：以 client_id 作为本地 id）
    // 同时修正离线期间以“本地用户ID”保存的记录归属：
    // 若本地已存在相同 client_id，但其 userId 与在线 userId 不同，则以云端数据覆盖并“转归属”为在线 userId。
    mergeServerRecords: (serverRecords: ServerHistoryRecord[], userId: string) => {
      if (!Array.isArray(serverRecords) || serverRecords.length === 0) return 0;

      let affected = 0;
      setHistoryRecords(prev => {
        const byId = new Map(prev.map(r => [r.id, r]));
        const updates = new Map<string, HistoryRecord>();
        const toAppend: HistoryRecord[] = [];

        for (const s of serverRecords) {
          if (s.user_id !== userId) continue;
          const clientId = (s.client_id || '').toString();
          if (!clientId) continue;

          const canonical: HistoryRecord = {
            id: clientId,
            userId: userId,
            date: new Date(s.date).getTime(),
            problemType: s.problem_type,
            difficulty: s.difficulty,
            totalProblems: s.total_problems,
            correctAnswers: s.correct_answers,
            accuracy: typeof s.accuracy === 'number' ? Math.round(s.accuracy) : Number(s.accuracy || 0),
            totalTime: s.total_time,
            averageTime: typeof s.average_time === 'number' ? Math.round(s.average_time) : Number(s.average_time || 0),
            problems: (s.problems ?? []) as any,
            answers: (s.answers ?? []) as any,
            answerTimes: (s.answer_times ?? []) as number[],
            score: s.score,
          };

          const local = byId.get(clientId);
          if (local) {
            // 若已存在，但 userId 不同或数据旧，则以云端版本覆盖
            if (
              local.userId !== userId ||
              local.date !== canonical.date ||
              local.score !== canonical.score ||
              local.correctAnswers !== canonical.correctAnswers
            ) {
              updates.set(clientId, canonical);
              affected += 1;
            }
          } else {
            toAppend.push(canonical);
            affected += 1;
          }
        }

        if (updates.size === 0 && toAppend.length === 0) return prev;

        const next = prev.map(r => updates.get(r.id) ?? r);
        if (toAppend.length > 0) next.unshift(...toAppend);
        return next;
      });

      return affected;
    },
    getUserIncompleteRecords: (userId: string): IncompleteHistoryRecord[] => {
      return incompleteHistoryRecords
        .filter(r => r.userId === userId)
        .sort((a, b) => b.date - a.date);
    },
    removeIncompleteBySession: (sessionId: string) => {
      setIncompleteHistoryRecords(prev => prev.filter(r => r.sessionId !== sessionId));
      return true;
    },
    clearUserIncompleteRecords: (userId: string) => {
      setIncompleteHistoryRecords(prev => prev.filter(r => r.userId !== userId));
      return true;
    }
  };
};