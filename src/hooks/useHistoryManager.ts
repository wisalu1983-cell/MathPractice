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
    
    // 🔧 额外的强制刷新机制：直接重新设置状态
    try {
      const storedRecords = localStorage.getItem('historyRecords');
      if (storedRecords) {
        const parsedRecords = JSON.parse(storedRecords);
        console.log('[refreshRecords] 强制更新完成记录状态:', parsedRecords.length);
        setHistoryRecords([...parsedRecords]); // 创建新数组强制更新
      }

      const storedIncomplete = localStorage.getItem('incompleteHistoryRecords');
      if (storedIncomplete) {
        const parsedIncomplete = JSON.parse(storedIncomplete);
        console.log('[refreshRecords] 强制更新未完成记录状态:', parsedIncomplete.length);
        setIncompleteHistoryRecords([...parsedIncomplete]); // 创建新数组强制更新
      }
    } catch (error) {
      console.error('[refreshRecords] 强制刷新失败:', error);
    }
    
    return true;
  }, [setHistoryRecords, setIncompleteHistoryRecords]);

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
        plannedTotalProblems: session.totalProblems,
        synced: false, // 新记录默认未同步
        timestamp: now // 记录创建时间
      };

      setIncompleteHistoryRecords(prev => {
        const idx = prev.findIndex(r => r.sessionId === record.sessionId && r.userId === userId);
        if (idx >= 0) {
          const cloned = prev.slice();
          // 更新时保留已有的 synced 状态（如果存在）
          const existingRecord = cloned[idx];
          cloned[idx] = {
            ...record,
            synced: existingRecord.synced ?? false // 保留原有同步状态或默认为 false
          };
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
    },
    // 清理重复的未完成记录（修复去重bug后的数据清理）
    cleanupDuplicateIncompleteRecords: (userId: string) => {
      setIncompleteHistoryRecords(prev => {
        console.log(`[cleanupDuplicateIncompleteRecords] 开始清理用户 ${userId} 的重复记录，当前数量: ${prev.length}`);
        
        // 按sessionId去重，保留最新的记录
        const seen = new Map<string, IncompleteHistoryRecord>();
        const cleaned = prev.filter(record => {
          if (record.userId !== userId) return true; // 保留其他用户的记录
          
          const key = record.sessionId || record.id;
          const existing = seen.get(key);
          
          if (!existing) {
            seen.set(key, record);
            return true;
          }
          
          // 保留更新的记录（基于date字段）
          if (record.date > existing.date) {
            seen.set(key, record);
            return true;
          }
          
          return false; // 丢弃重复的旧记录
        });
        
        console.log(`[cleanupDuplicateIncompleteRecords] 清理完成，从 ${prev.length} 条减少到 ${cleaned.length} 条`);
        return cleaned;
      });
    },
    
    // 合并服务端未完成记录
    mergeServerIncompleteRecords: (serverRecords: any[], userId: string) => {
      console.log(`[mergeServerIncompleteRecords] 开始合并 ${serverRecords.length} 条服务端未完成记录`);
      console.log(`[mergeServerIncompleteRecords] 服务端记录详情:`, serverRecords);
      
      // 🔧 基于当前状态进行去重和合并，避免状态不同步
      const current = incompleteHistoryRecords;
      console.log(`[mergeServerIncompleteRecords] 当前本地记录数: ${current.length}`);
      
      // 预先处理数据并计算affected
      const processedData = (() => {
        // 在内存中去重，不立即更新状态
        const seen = new Map<string, IncompleteHistoryRecord>();
        const dedupedCurrent = current.filter(record => {
          const key = record.sessionId || record.id;
          if (seen.has(key)) {
            console.log(`[mergeServerIncompleteRecords] 发现重复本地记录，跳过: ${key}`);
            return false;
          }
          seen.set(key, record);
          return true;
        });
        
        if (dedupedCurrent.length !== current.length) {
          console.log(`[mergeServerIncompleteRecords] 发现 ${current.length - dedupedCurrent.length} 条重复本地记录，将在合并时一并处理`);
        }
        
        const byClientId = new Map(dedupedCurrent.map(r => [r.sessionId || r.id, r]));
        const updates = new Map();
        const toAppend: IncompleteHistoryRecord[] = [];
        let affected = 0;
        
        for (const serverRecord of serverRecords) {
          const clientId = serverRecord.client_id;
          console.log(`[mergeServerIncompleteRecords] 处理记录 client_id: ${clientId}`);
          
          if (!clientId) {
            console.warn(`[mergeServerIncompleteRecords] 跳过无client_id记录:`, serverRecord);
            continue;
          }
          
          // 转换服务端记录格式到本地格式
          const canonical: IncompleteHistoryRecord = {
            id: clientId,
            sessionId: clientId,
            userId: userId,
            date: new Date(serverRecord.date).getTime(),
            problemType: serverRecord.problem_type,
            difficulty: serverRecord.difficulty,
            totalProblems: serverRecord.total_problems,
            correctAnswers: serverRecord.correct_answers,
            accuracy: serverRecord.accuracy,
            totalTime: serverRecord.total_time,
            averageTime: serverRecord.average_time,
            problems: serverRecord.problems,
            answers: serverRecord.answers,
            answerTimes: serverRecord.answer_times,
            score: serverRecord.score,
            plannedTotalProblems: serverRecord.planned_total_problems,
            synced: true, // 从服务端拉取的记录标记为已同步
            timestamp: new Date(serverRecord.date).getTime() // 使用服务端时间作为时间戳
          };
          
          console.log(`[mergeServerIncompleteRecords] 转换后的记录:`, canonical);
          
          const local = byClientId.get(clientId);
          if (local) {
            console.log(`[mergeServerIncompleteRecords] 找到本地记录:`, local);
            if (local.userId !== userId) {
              console.warn(`[mergeServerIncompleteRecords] 冲突: 本地记录 ${local.id} 已属于用户 ${local.userId}, 但服务端记录属于 ${userId}`);
              continue;
            } else {
              // 同一账号下，检查数据是否需要更新
              const needsUpdate = (
                local.date !== canonical.date ||
                local.score !== canonical.score ||
                local.correctAnswers !== canonical.correctAnswers ||
                local.totalProblems !== canonical.totalProblems ||
                local.accuracy !== canonical.accuracy ||
                local.totalTime !== canonical.totalTime ||
                local.synced !== canonical.synced
              );
              
              console.log(`[mergeServerIncompleteRecords] 是否需要更新: ${needsUpdate}`);
              if (needsUpdate) {
                // 优先使用最新的数据（基于日期）
                if (canonical.date >= local.date) {
                  updates.set(clientId, canonical);
                  affected += 1;
                  console.log(`[mergeServerIncompleteRecords] 更新本地记录: ${clientId}`);
                } else {
                  console.log(`[mergeServerIncompleteRecords] 保留本地较新数据: ${clientId}`);
                }
              } else {
                console.log(`[mergeServerIncompleteRecords] 记录无需更新: ${clientId}`);
              }
            }
          } else {
            // 新数据，直接添加
            console.log(`[mergeServerIncompleteRecords] 添加新记录: ${clientId}`);
            toAppend.push(canonical);
            affected += 1;
          }
        }
        
        console.log(`[mergeServerIncompleteRecords] 待更新: ${updates.size}, 待添加: ${toAppend.length}`);
        
        return { updates, toAppend, affected, dedupedCurrent };
      })();
      
      const { updates, toAppend, affected, dedupedCurrent } = processedData;
      
      // 检查是否有任何变化（包括去重和合并）
      const hasDeduplication = dedupedCurrent.length !== current.length;
      const hasMergeChanges = updates.size > 0 || toAppend.length > 0;
      
      if (!hasDeduplication && !hasMergeChanges) {
        console.log(`[mergeServerIncompleteRecords] 无变化，不更新状态`);
        return 0;
      }
      
      // 一次性更新状态：基于去重后的数据进行合并
      setIncompleteHistoryRecords(() => {
        const next = dedupedCurrent.map(r => updates.get(r.sessionId || r.id) ?? r);
        if (toAppend.length > 0) next.unshift(...toAppend);
        console.log(`[mergeServerIncompleteRecords] 最终状态更新: ${current.length} → ${next.length} (去重: ${hasDeduplication ? '是' : '否'}, 合并: ${affected}条)`);
        return next;
      });
      
      // 只返回新合并的服务端记录数量，去重不算作"合并"
      console.log(`[mergeServerIncompleteRecords] 合并完成，新增 ${affected} 条服务端记录 ${hasDeduplication ? '(同时进行了去重)' : ''}`);
      return affected;
    },
    // 标记未完成记录为已同步
    markIncompleteRecordAsSynced: (sessionId: string) => {
      setIncompleteHistoryRecords(prev => {
        const updated = prev.map(record => {
          if (record.sessionId === sessionId) {
            return { ...record, synced: true };
          }
          return record;
        });
        return updated;
      });
      return true;
    }
  };
};