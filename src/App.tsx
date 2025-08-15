import React, { useState, useEffect } from 'react';
import { ProblemType, Difficulty, GameSession, UserAction, HistoryRecord } from './types';
import { generateProblems } from './utils/problemGenerator';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUserManager } from './hooks/useUserManager';
import { useHistoryManager } from './hooks/useHistoryManager';
import { GameSetup } from './components/GameSetup';
import { ProblemDisplay } from './components/ProblemDisplay';
import { ResultSummary } from './components/ResultSummary';
import { UserInfo } from './components/UserInfo';
import { UserModal } from './components/UserModal';
import { HistoryList } from './components/HistoryList';
import { Home } from 'lucide-react';
import { TestDataGenerator } from './components/TestDataGenerator';
import { OnlineAuthModal } from './components/OnlineAuthModal';
import { TestPanel } from './components/TestPanel';
import { SimplifiedTestPanel } from './components/SimplifiedTestPanel';
import { useOnlineAuth } from './hooks/useOnlineAuth';
import { useSyncManager } from './hooks/useSyncManager';
import { getProfile } from './services/auth';
import { testLogger, logUserAction } from './utils/testLogger';


const initialSession: GameSession = {
  currentProblem: null,
  problems: [],
  currentIndex: 0,
  answers: [],
  answerTimes: [],
  score: 0,
  totalProblems: 0,
  correctAnswers: 0,
  isActive: false,
  isCompleted: false,
  sessionId: '',
  startTime: 0,
  problemStartTimes: [],
};

type AppView = 'home' | 'game' | 'result' | 'history' | 'historyDetail';

function App() {
  const [selectedType, setSelectedType] = useState<ProblemType>('mental');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('basic');
  const [session, setSession] = useLocalStorage<GameSession>('mathSession', initialSession);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | number>('');
  const [isRecordSaved, setIsRecordSaved] = useState(false); // 记录是否已保存的状态

  const userManager = useUserManager();
  const historyManager = useHistoryManager();
  // 直接订阅historyManager的状态，确保UI能响应数据变化
  const allHistoryRecords = historyManager.historyRecords;
  const allIncompleteRecords = historyManager.incompleteHistoryRecords;
  const [showUserModal, setShowUserModal] = useState(false);
  const [userAction, setUserAction] = useState<UserAction>('login');
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<HistoryRecord | null>(null);
  const [showTestGenerator, setShowTestGenerator] = useState(false);
  const [showOnlineAuth, setShowOnlineAuth] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showSimplifiedTestPanel, setShowSimplifiedTestPanel] = useState(false);
  const [onlineUserDisplayName, setOnlineUserDisplayName] = useState<string | null>(null);
  const online = useOnlineAuth();
  const sync = useSyncManager(online.user?.id ?? null);

  // 🔄 用户登录后检查并同步本地未上传的未完成记录（修复无限循环）
  useEffect(() => {
    if (!online.user) return;
    
    // 使用一个 ref 来避免重复执行
    let hasExecuted = false;
    
    const syncUnuploadedIncompleteRecords = async () => {
      if (hasExecuted) return;
      hasExecuted = true;
      
      console.log('[App] 🔍 检查本地未上传的未完成记录...');
      
      try {
        // 获取当前用户的所有本地未完成记录
        const localIncompleteRecords = historyManager.incompleteHistoryRecords;
        const unuploadedRecords = localIncompleteRecords.filter(record => 
          record.userId === online.user!.id && !record.synced
        );
        
        if (unuploadedRecords.length === 0) {
          console.log('[App] ✅ 没有待上传的未完成记录');
          return;
        }
        
        console.log(`[App] 📤 发现${unuploadedRecords.length}条未上传的未完成记录，开始同步...`);
        
        for (const record of unuploadedRecords) {
          try {
            const payload = {
              client_id: record.sessionId,
              date: new Date(record.timestamp).toISOString(),
              problem_type: record.problemType,
              difficulty: record.difficulty,
              total_problems: record.totalProblems,
              correct_answers: record.correctAnswers,
              accuracy: record.accuracy,
              total_time: record.totalTime,
              average_time: record.averageTime,
              problems: record.problems,
              answers: record.answers,
              answer_times: record.answerTimes,
              score: record.score,
              planned_total_problems: record.plannedTotalProblems
            };
            
            console.log(`[App] 📤 上传未完成记录: ${record.sessionId}`);
            sync.enqueueRecord(payload);
            await sync.flush();
            
            // 标记为已同步
            historyManager.markIncompleteRecordAsSynced(record.sessionId);
            console.log(`[App] ✅ 未完成记录已上传并标记: ${record.sessionId}`);
            
          } catch (error) {
            console.error(`[App] ❌ 上传未完成记录失败: ${record.sessionId}`, error);
            // 失败的记录保持未同步状态，下次继续尝试
          }
        }
      } catch (error) {
        console.error('[App] ❌ 同步未完成记录过程中发生错误:', error);
      }
    };

    // 延迟执行，确保其他初始化完成
    const timeoutId = setTimeout(syncUnuploadedIncompleteRecords, 1500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [online.user?.id]); // 只依赖用户ID，避免对象引用变化导致的无限循环


  // 路由守卫：避免在渲染阶段触发 setState 导致循环
  useEffect(() => {
    if (currentView === 'history' && !online.user && !userManager.currentUser) {
      setCurrentView('home');
    }
  }, [currentView, online.user, userManager.currentUser]);

  // 获取在线用户的显示名称
  useEffect(() => {
    let mounted = true;
    if (!online.user) {
      setOnlineUserDisplayName(null);
      return;
    }
    getProfile(online.user.id)
      .then(profile => {
        if (!mounted) return;
        setOnlineUserDisplayName(profile?.name || null);
      })
      .catch(() => {
        if (!mounted) return;
        setOnlineUserDisplayName(null);
      });
    return () => { mounted = false; };
  }, [online.user]);

  // 当游戏结束时自动保存记录
  useEffect(() => {
    console.log('[App] useEffect triggered:', {
      isCompleted: session.isCompleted,
      isRecordSaved: isRecordSaved,
      sessionId: session.sessionId,
      currentView: currentView
    });
    
    if (session.isCompleted && !isRecordSaved) {
      const activeUserId = online.user?.id || userManager.currentUser?.id;
      
      if (!activeUserId) {
        console.warn('No active user found for saving record');
        setIsRecordSaved(true);
        return;
      }

      console.log('[App] 🎯 游戏完成，开始保存记录，sessionId:', session.sessionId);
      const recordId = historyManager.saveRecord(session, activeUserId);
      
      // 清理本地未完成记录（游戏完成后不再需要）
      if (session.sessionId) {
        historyManager.removeIncompleteBySession(session.sessionId);
        console.log('[App] 已清理本地未完成记录');
      }
      
      // 同步完成记录到云端
      if (online.user) {
        const completedClientId = session.sessionId || recordId;
        const payload = {
          client_id: completedClientId,
          date: new Date((session.endTime || Date.now())).toISOString(),
          problem_type: session.problemType!,
          difficulty: session.difficulty!,
          total_problems: session.totalProblems,
          correct_answers: session.correctAnswers,
          accuracy: Math.round((session.correctAnswers / session.totalProblems) * 100),
          total_time: session.endTime && session.startTime ? Math.round((session.endTime - session.startTime) / 1000) : 0,
          average_time: session.totalProblems > 0 && session.endTime && session.startTime ? Math.round(((session.endTime - session.startTime) / 1000) / session.totalProblems) : 0,
          problems: session.problems,
          answers: session.answers,
          answer_times: session.answerTimes,
          score: session.score,
        };
        
        console.log('[App] 📤 同步完成记录到云端:', payload);
        sync.enqueueRecord(payload);
        sync.flush();
      }
      
      setIsRecordSaved(true);
    }
  }, [session.isCompleted, isRecordSaved, historyManager, online.user, userManager.currentUser, sync]);

  // 暂不做“未完成记录”续玩，移除周期性保存与 beforeunload 钩子

  const startGame = () => {
    const problems = generateProblems(selectedType, selectedDifficulty);
    const currentTime = Date.now();
    const sessionId = `${currentTime}_${Math.random().toString(36).slice(2, 8)}`;
    const newSession: GameSession = {
      ...initialSession,
      problems,
      currentProblem: problems[0],
      totalProblems: problems.length,
      isActive: true,
      startTime: currentTime,
      sessionId,
      problemType: selectedType,
      difficulty: selectedDifficulty,
      problemStartTimes: [currentTime],
    };
    
    setSession(newSession);
    setCurrentView('game');
    setShowResult(false);
    setIsCorrect(null);
    setUserAnswer('');
    setIsRecordSaved(false); // 重置保存状态
  };

  const handleAnswer = (answer: string | number) => {
    if (!session.currentProblem) return;
    
    const answerTime = Date.now();
    const problemStartTime = session.problemStartTimes[session.currentIndex] || session.startTime;
    const timeSpent = Math.round((answerTime - problemStartTime) / 1000);
    
    setUserAnswer(answer);
    
    let correct = false;
    if (session.currentProblem.isMultipleChoice) {
      correct = answer === session.currentProblem.correctChoice;
    } else if (session.currentProblem.isDivision) {
      const userAnswerStr = answer.toString().toLowerCase().trim();
      const correctAnswerStr = session.currentProblem.answer.toString().toLowerCase().trim();
      
      if (session.currentProblem.remainder === 0) {
        const quotientOnly = session.currentProblem.quotient?.toString();
        correct = userAnswerStr === correctAnswerStr || userAnswerStr === quotientOnly;
      } else {
        correct = userAnswerStr === correctAnswerStr;
      }
    } else {
      const userAnswerStr = answer.toString().toLowerCase().trim();
      const correctAnswerStr = session.currentProblem.answer.toString().toLowerCase().trim();
      correct = userAnswerStr === correctAnswerStr;
    }
    
    setIsCorrect(correct);
    setShowResult(true);
    
    const newAnswers = [...session.answers];
    newAnswers[session.currentIndex] = answer;
    
    const newAnswerTimes = [...session.answerTimes];
    newAnswerTimes[session.currentIndex] = timeSpent;

    const updatedSession: GameSession = {
      ...session,
      answers: newAnswers,
      answerTimes: newAnswerTimes,
      correctAnswers: session.correctAnswers + (correct ? 1 : 0),
      score: session.score + (correct ? 10 : 0),
    };

    setSession(updatedSession);
    // 增量保存未完成记录快照（仅本地保存，减少云端同步频率）
    {
      const userId = online.user?.id || userManager.currentUser?.id;
      if (userId) {
        historyManager.upsertIncompleteRecord(updatedSession, userId);
        
        // 🎯 关键修复：答题过程中只在本地保存未完成记录，不同步云端
        // 避免在最后一题时产生云端未完成记录，导致与完成记录重复
        const answeredCount = updatedSession.answers.filter(a => a !== undefined).length;
        console.log(`[App] 第${answeredCount}题完成，已保存到本地（未完成记录不同步云端，避免重复）`);
      }
    }
  };

  const nextProblem = () => {
    const nextIndex = session.currentIndex + 1;
    
    if (nextIndex >= session.problems.length) {
      // 游戏完成：不需要删除云端未完成记录，因为答题过程中不会产生云端未完成记录
      setSession(prev => ({
        ...prev,
        isCompleted: true,
        isActive: false,
        endTime: Date.now(),
      }));
      setCurrentView('result');
    } else {
      const currentTime = Date.now();
      const newProblemStartTimes = [...session.problemStartTimes];
      newProblemStartTimes[nextIndex] = currentTime;
      
      setSession(prev => ({
        ...prev,
        currentIndex: nextIndex,
        currentProblem: prev.problems[nextIndex],
        problemStartTimes: newProblemStartTimes,
      }));
      setShowResult(false);
      setIsCorrect(null);
      setUserAnswer('');
    }
  };

  const resetGame = () => {
    // 若正在进行但未完成，返回首页前先保存一次"未完成进度"快照
    if (session.isActive && !session.isCompleted) {
      const userId = online.user?.id || userManager.currentUser?.id;
      if (userId) {
        historyManager.upsertIncompleteRecord(session, userId);
        
        // 恢复：游戏中断时同步未完成记录到云端，用于记录用户放弃情况
        if (online.user) {
          const answeredCount = session.answers.filter(a => a !== undefined).length;
          const totalTime = session.answerTimes.filter(t => typeof t === 'number').reduce((s, t) => s + (t || 0), 0);
          const averageTime = answeredCount > 0 ? Math.round(totalTime / answeredCount) : 0;
          
          const clientId = session.sessionId;
          if (!clientId) {
            console.error('[App] sessionId未设置，跳过未完成记录同步');
            return;
          }
          const incompletePayload = {
            client_id: clientId,
            date: new Date().toISOString(),
            problem_type: session.problemType!,
            difficulty: session.difficulty!,
            total_problems: answeredCount,
            correct_answers: session.correctAnswers,
            accuracy: answeredCount > 0 ? Math.round((session.correctAnswers / answeredCount) * 100) : 0,
            total_time: totalTime,
            average_time: averageTime,
            problems: session.problems,
            answers: session.answers,
            answer_times: session.answerTimes,
            score: session.score,
            planned_total_problems: session.totalProblems
          } as const;
          
          console.log('[App] 游戏中断，同步未完成记录到云端:', incompletePayload);
          sync.enqueueRecord(incompletePayload);
          sync.flush();
        }
      }
    }
    setSession(initialSession);
    setShowResult(false);
    setIsCorrect(null);
    setUserAnswer('');
    setCurrentView('home');
    setSelectedHistoryRecord(null);
    setIsRecordSaved(false); // 重置保存状态
  };

  const restartSameGame = () => {
    const problems = generateProblems(selectedType, selectedDifficulty);
    const currentTime = Date.now();
    const sessionId = `${currentTime}_${Math.random().toString(36).slice(2, 8)}`;
    const newSession: GameSession = {
      ...initialSession,
      problems,
      currentProblem: problems[0],
      totalProblems: problems.length,
      isActive: true,
      startTime: currentTime,
      sessionId,
      problemType: selectedType,
      difficulty: selectedDifficulty,
      problemStartTimes: [currentTime],
    };
    
    setSession(newSession);
    setCurrentView('game');
    setShowResult(false);
    setIsCorrect(null);
    setUserAnswer('');
    setIsRecordSaved(false); // 重置保存状态
  };

  const handleUserAction = (action: UserAction) => {
    setUserAction(action);
    
    if (action === 'viewHistory') {
      // 仅当已登录在线账号或使用旧本地用户时允许进入历史
      if (online.user || userManager.currentUser) {
        setCurrentView('history');
      }
    } else if (action === 'login') {
      setShowOnlineAuth(true);
    } else {
      setShowUserModal(true);
    }
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
  };

  const handleViewHistoryRecord = (record: HistoryRecord) => {
    const historicalSession: GameSession = {
      currentProblem: null,
      problems: record.problems,
      currentIndex: record.totalProblems - 1,
      answers: record.answers,
      answerTimes: record.answerTimes,
      score: record.score,
      totalProblems: record.totalProblems,
      correctAnswers: record.correctAnswers,
      isActive: false,
      isCompleted: true,
      sessionId: `history_${record.id}`,
      startTime: record.date - record.totalTime * 1000,
      endTime: record.date,
      problemType: record.problemType,
      difficulty: record.difficulty,
      problemStartTimes: []
    };
    
    setSelectedHistoryRecord(record);
    setSession(historicalSession);
    setCurrentView('historyDetail');
  };

  const handleBackFromHistory = () => {
    setCurrentView('history');
    setSelectedHistoryRecord(null);
  };

  const handleBackFromHistoryList = () => {
    setCurrentView('home');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'game':
        return session.currentProblem && (
          <ProblemDisplay
            problem={session.currentProblem}
            problemIndex={session.currentIndex}
            totalProblems={session.totalProblems}
            onAnswer={handleAnswer}
            onNext={nextProblem}
            showResult={showResult}
            isCorrect={isCorrect}
            userAnswer={userAnswer}
          />
        );

      case 'result':
      case 'historyDetail':
        const onRestart = currentView === 'historyDetail' ? startGame : restartSameGame;
        return (
          <div>
            {currentView === 'historyDetail' && (
              <div className="mb-4">
                <button
                  onClick={handleBackFromHistory}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← 返回历史记录
                </button>
              </div>
            )}
            <ResultSummary 
              session={session}
              onRestart={onRestart}
              onHome={resetGame}
            />
          </div>
        );

      case 'history':
        // 未登录在线账号、且未选择旧本地用户时，渲染空（useEffect 会跳回首页）
        if (!online.user && !userManager.currentUser) return null;
        {
          const historyUser = online.user
            ? {
                id: online.user.id,
                name: onlineUserDisplayName || '未命名',
                createdAt: Date.now(),
                lastLoginAt: Date.now(),
              }
            : userManager.currentUser!;
            
          // 使用响应式状态过滤用户记录，确保数据同步后UI立即更新
          const userHistoryRecords = allHistoryRecords.filter(r => r.userId === historyUser.id);
          const userIncompleteRecords = allIncompleteRecords.filter(r => r.userId === historyUser.id);
          
          return (
            <HistoryList
              user={historyUser}
              records={userHistoryRecords}
              incompleteRecords={userIncompleteRecords}
              onBack={handleBackFromHistoryList}
              onViewRecord={handleViewHistoryRecord}
            />
          );
        }

      default: // 'home'
        return (
          <GameSetup
            selectedType={selectedType}
            selectedDifficulty={selectedDifficulty}
            onTypeChange={setSelectedType}
            onDifficultyChange={setSelectedDifficulty}
            onStartGame={startGame}
          />
        );
    }
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'result':
        return '练习完成';
      case 'history':
        return '历史记录';
      case 'historyDetail':
        return '记录详情';
      case 'game':
        return '答题中';
      default:
        return '让学习变得更有趣';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-3">
              <span className="text-white text-2xl font-bold">🧮</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">小学数学练习</h1>
              <p className="text-sm text-gray-600">{getHeaderTitle()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <UserInfo
              userName={online.user ? (onlineUserDisplayName || online.user.email || 'Online User') : userManager.getCurrentUserName()}
              isLoggedIn={online.user ? true : userManager.isLoggedIn()}
              isDeveloper={online.isDeveloper || userManager.isDeveloper()}
              onUserAction={handleUserAction}
              onGenerateTestData={() => setShowTestGenerator(true)}
              onShowOnlineAuth={() => setShowOnlineAuth(true)}
              onSyncNow={() => sync.flush()}
              onShowTestPanel={() => setShowTestPanel(true)}
              onShowSimplifiedTestPanel={() => setShowSimplifiedTestPanel(true)}
            />

            {online.user && sync.lastSyncAt && (
              <span className="text-xs text-gray-500">
                上次同步 {new Date(sync.lastSyncAt).toLocaleTimeString('zh-CN', { hour12: false })}
              </span>
            )}
            
            {currentView !== 'home' && (
              <button
                onClick={resetGame}
                className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-xl border border-gray-200 transition-colors duration-200 flex items-center"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </button>
            )}


          </div>
        </div>

        {renderContent()}

        {currentView === 'home' && (
          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">
              坚持练习，你会越来越棒！ 💪
            </p>
          </div>
        )}

        <UserModal
          isOpen={showUserModal}
          onClose={handleCloseUserModal}
          action={userAction}
          users={userManager.users}
          onCreateUser={userManager.createUser}
          onLoginUser={userManager.loginUser}
          currentUser={userManager.currentUser}
        />

        <OnlineAuthModal
          isOpen={showOnlineAuth}
          onClose={() => setShowOnlineAuth(false)}
        />



        <TestDataGenerator
          isOpen={showTestGenerator}
          onClose={() => setShowTestGenerator(false)}
          currentUserId={online.user?.id || userManager.currentUser?.id || null}
          saveRecords={historyManager.saveRecords}
          refreshRecords={historyManager.refreshRecords}
          clearUserRecords={historyManager.clearUserRecords}
          upsertIncompleteRecord={historyManager.upsertIncompleteRecord}
          clearUserIncompleteRecords={historyManager.clearUserIncompleteRecords}
          onSyncNow={sync.flush}
        />

        <TestPanel
          isOpen={showTestPanel}
          onClose={() => setShowTestPanel(false)}
        />

        <SimplifiedTestPanel
          isOpen={showSimplifiedTestPanel}
          onClose={() => setShowSimplifiedTestPanel(false)}
          isOnline={navigator.onLine ?? true}
          onlineUserId={online.user?.id ?? null}
        />
      </div>
    </div>
  );
}

export default App;