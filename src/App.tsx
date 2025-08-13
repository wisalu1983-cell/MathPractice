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
import { useOnlineAuth } from './hooks/useOnlineAuth';
import { useSyncManager } from './hooks/useSyncManager';
import { ImportLocalHistoryModal } from './components/ImportLocalHistoryModal';

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
  const [showUserModal, setShowUserModal] = useState(false);
  const [userAction, setUserAction] = useState<UserAction>('login');
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<HistoryRecord | null>(null);
  const [showTestGenerator, setShowTestGenerator] = useState(false);
  const [showOnlineAuth, setShowOnlineAuth] = useState(false);
  const online = useOnlineAuth();
  const sync = useSyncManager(online.user?.id ?? null);
  const [showImportModal, setShowImportModal] = useState(false);

  // 当游戏结束时自动保存记录
  useEffect(() => {
    if (session.isCompleted && !isRecordSaved && userManager.currentUser && currentView === 'result') {
      const recordId = historyManager.saveRecord(session, userManager.currentUser.id);
      // 若在线，组装服务端 payload 入队（最小实现：字段名转下划线 + client_id）
      if (online.user) {
        const payload = {
          client_id: recordId,
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
        } as const;
        sync.enqueueRecord(payload);
        // 立即尝试上行
        sync.flush();
      }
      setIsRecordSaved(true); // 标记为已保存
    }
  }, [session.isCompleted, isRecordSaved, userManager.currentUser, currentView, historyManager, online.user, sync]);

  // 自动周期性保存未完成进度（更可靠），以及在关闭/刷新页面时保存一次
  useEffect(() => {
    if (!session.isActive || session.isCompleted) return;

    const userId = online.user?.id || userManager.currentUser?.id;
    if (!userId) return;

    const intervalId = window.setInterval(() => {
      historyManager.upsertIncompleteRecord(session, userId);
    }, 10000); // 每10秒一次

    const handleBeforeUnload = () => {
      historyManager.upsertIncompleteRecord(session, userId);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session.isActive, session.isCompleted, session.sessionId, userManager.currentUser, online.user, historyManager, session]);

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
    // 增量保存未完成记录快照
    {
      const userId = online.user?.id || userManager.currentUser?.id;
      if (userId) historyManager.upsertIncompleteRecord(updatedSession, userId);
    }
  };

  const nextProblem = () => {
    const nextIndex = session.currentIndex + 1;
    
    if (nextIndex >= session.problems.length) {
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
    // 若正在进行但未完成，返回首页前先保存一次“未完成进度”快照
    if (session.isActive && !session.isCompleted) {
      const userId = online.user?.id || userManager.currentUser?.id;
      if (userId) historyManager.upsertIncompleteRecord(session, userId);
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
      if (userManager.currentUser) {
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
        const historyUser = online.user
          ? {
              id: online.user.id,
              name: online.user.email || 'Online User',
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
            }
          : userManager.currentUser;
        return historyUser && (
          <HistoryList
            user={historyUser}
            records={historyManager.getUserRecords(historyUser.id)}
            incompleteRecords={historyManager.getUserIncompleteRecords(historyUser.id)}
            onBack={handleBackFromHistoryList}
            onViewRecord={handleViewHistoryRecord}
          />
        );

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
              userName={userManager.getCurrentUserName()}
              isLoggedIn={userManager.isLoggedIn()}
              isDeveloper={userManager.isDeveloper()}
              onUserAction={handleUserAction}
              onGenerateTestData={() => setShowTestGenerator(true)}
              onShowOnlineAuth={() => setShowOnlineAuth(true)}
              onShowImportLocalHistory={() => setShowImportModal(true)}
              onSyncNow={() => sync.flush()}
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

            {/* 常驻的“导入本地历史”按钮已移除：入口移动到设置菜单（在线状态） */}
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

        <ImportLocalHistoryModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          localUsers={userManager.users.filter(u => !u.isDeveloper)}
          getLocalRecordCount={(uid) => historyManager.getLocalRecordCount(uid)}
          onImportSelected={async (userIds) => {
            // 将选中的本地用户的完成记录转为服务器 payload 入队
            if (!online.user) return;
            const payloads = userIds
              .flatMap(uid => historyManager.getUserRecords(uid))
              .map(r => ({
                client_id: r.id,
                date: new Date(r.date).toISOString(),
                problem_type: r.problemType,
                difficulty: r.difficulty,
                total_problems: r.totalProblems,
                correct_answers: r.correctAnswers,
                accuracy: r.accuracy,
                total_time: r.totalTime,
                average_time: r.averageTime,
                problems: r.problems,
                answers: r.answers,
                answer_times: r.answerTimes,
                score: r.score,
              }));
            const added = sync.enqueueBatch(payloads);
            // 立即尝试上行
            if (added > 0) await sync.flush();
            setShowImportModal(false);
          }}
        />

        <TestDataGenerator
          isOpen={showTestGenerator}
          onClose={() => setShowTestGenerator(false)}
          currentUserId={userManager.currentUser?.id || null}
          saveRecords={historyManager.saveRecords}
          refreshRecords={historyManager.refreshRecords}
          clearUserRecords={historyManager.clearUserRecords}
          upsertIncompleteRecord={historyManager.upsertIncompleteRecord}
          clearUserIncompleteRecords={historyManager.clearUserIncompleteRecords}
        />
      </div>
    </div>
  );
}

export default App;