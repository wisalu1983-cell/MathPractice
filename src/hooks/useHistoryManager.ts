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
      try {
        const storedRecords = localStorage.getItem('historyRecords');
        if (storedRecords) {
          try {
            const parsedRecords = JSON.parse(storedRecords);
            setHistoryRecords(parsedRecords);
          } catch (parseError) {
            console.error('Failed to parse history records:', parseError);
            // 如果解析失败，清除损坏的数据
            localStorage.removeItem('historyRecords');
            setHistoryRecords([]);
          }
        }

        const storedIncomplete = localStorage.getItem('incompleteHistoryRecords');
        if (storedIncomplete) {
          try {
            const parsedIncomplete = JSON.parse(storedIncomplete);
            setIncompleteHistoryRecords(parsedIncomplete);
          } catch (parseError) {
            console.error('Failed to parse incomplete history records:', parseError);
            // 如果解析失败，清除损坏的数据
            localStorage.removeItem('incompleteHistoryRecords');
            setIncompleteHistoryRecords([]);
          }
        }
      } catch (error) {
        console.error('Failed to refresh records from localStorage:', error);
      }
    }
  }, [refreshTrigger]); // 移除setHistoryRecords和setIncompleteHistoryRecords依赖，避免无限循环

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
    // 将服务器记录合并到本地（去重：以 client_id 作为主键）
    // 兼容“旧本地用户保留”策略：
    // 若本地已存在相同 client_id，但归属为其它本地用户，则不覆盖原记录，
    // 而是为在线账号生成一个别名ID（userId_clientId）加入，避免清空旧本地用户的数据。
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

          let canonical: HistoryRecord = {
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
            if (local.userId !== userId) {
              // 严重冲突：同一个 client_id 属于不同用户
              // 这表明数据完整性出现问题，需要记录并谨慎处理
              console.warn(`[mergeServerRecords] 数据冲突: client_id ${clientId} 在本地属于用户 ${local.userId}, 但服务端属于用户 ${userId}`);
              
              // 采用保守策略：保留本地数据，为服务端数据生成新的ID
              // 这样可以避免数据丢失，但需要后续人工处理
              const conflictId = `conflict_${Date.now()}_${clientId}`;
              canonical = { ...canonical, id: conflictId };
              
              // 记录冲突信息，供后续分析
              console.error(`[mergeServerRecords] 创建冲突记录: ${conflictId}, 原始服务端数据:`, s);
              
              toAppend.push(canonical);
              affected += 1;
              
              // TODO: 在生产环境中，应该将冲突信息发送到监控系统
              // 用于分析数据一致性问题的根本原因
            } else {
              // 同一账号下，检查数据是否需要更新
              // 使用更全面的比较策略，包括核心数据字段
              const needsUpdate = (
                local.date !== canonical.date ||
                local.score !== canonical.score ||
                local.correctAnswers !== canonical.correctAnswers ||
                local.totalProblems !== canonical.totalProblems ||
                local.accuracy !== canonical.accuracy ||
                local.totalTime !== canonical.totalTime
              );
              
              if (needsUpdate) {
                // 优先使用最新的数据（基于日期）
                if (canonical.date >= local.date) {
                  updates.set(clientId, canonical);
                  affected += 1;
                } else {
                  // 本地数据更新，保留本地数据
                  console.log(`[mergeServerRecords] 保留本地较新数据: ${clientId}`);
                }
              }
            }
          } else {
            // 新数据，直接添加
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