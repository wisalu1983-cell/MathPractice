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

  // 当游戏结束时自动保存记录
  useEffect(() => {
    if (session.isCompleted && !isRecordSaved && userManager.currentUser && currentView === 'result') {
      historyManager.saveRecord(session, userManager.currentUser.id);
      setIsRecordSaved(true); // 标记为已保存
    }
  }, [session.isCompleted, isRecordSaved, userManager.currentUser, currentView, historyManager]);

  // 自动周期性保存未完成进度（更可靠），以及在关闭/刷新页面时保存一次
  useEffect(() => {
    if (!session.isActive || session.isCompleted || !userManager.currentUser) return;

    const userId = userManager.currentUser.id;
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
  }, [session.isActive, session.isCompleted, session.sessionId, userManager.currentUser, historyManager, session]);

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
    if (userManager.currentUser) {
      historyManager.upsertIncompleteRecord(updatedSession, userManager.currentUser.id);
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
    } else if (action === 'exportData') {
      // 导出数据
      if (!userManager.currentUser) {
        alert('请先登录用户后再导出数据');
        return;
      }
      
      const currentUser = userManager.currentUser;
      const userRecords = historyManager.getUserRecords(currentUser.id);
      
      const exportData = {
        user: currentUser, // 导出当前用户信息
        records: userRecords, // 导出该用户的所有记录
        exportDate: Date.now(),
        version: '1.0' // 添加版本号用于后续兼容性
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `math-practice-${currentUser.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (action === 'importData') {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = JSON.parse(e.target?.result as string);
              
              // 支持新版本数据格式（单用户 + 记录）
              if (data.user && data.records && Array.isArray(data.records)) {
                const importUser = data.user;
                const importRecords = data.records;
                
                // 检查用户是否已存在
                const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
                const userExists = existingUsers.some((user: any) => user.id === importUser.id);
                
                let shouldProceed = true;
                if (userExists) {
                  shouldProceed = confirm(`用户 "${importUser.name}" 已存在，是否覆盖其数据？`);
                }
                
                if (shouldProceed) {
                  // 更新或添加用户
                  const updatedUsers = userExists 
                    ? existingUsers.map((user: any) => user.id === importUser.id ? importUser : user)
                    : [...existingUsers, importUser];
                  localStorage.setItem('users', JSON.stringify(updatedUsers));
                  
                  // 更新历史记录：移除该用户的旧记录，添加新记录
                  const existingRecords = JSON.parse(localStorage.getItem('historyRecords') || '[]');
                  const filteredRecords = existingRecords.filter((record: any) => record.userId !== importUser.id);
                  const updatedRecords = [...importRecords, ...filteredRecords];
                  localStorage.setItem('historyRecords', JSON.stringify(updatedRecords));
                  
                  alert(`成功导入用户 "${importUser.name}" 的数据，包含 ${importRecords.length} 条练习记录`);
                  // 刷新页面以加载新数据
                  window.location.reload();
                }
              }
              // 支持旧版本数据格式（兼容性）
              else if (data.users && Array.isArray(data.users)) {
                // 恢复用户数据
                localStorage.setItem('users', JSON.stringify(data.users));
                // 恢复历史记录
                if (data.history && Array.isArray(data.history)) {
                  localStorage.setItem('historyRecords', JSON.stringify(data.history));
                }
                alert('成功导入数据（旧格式）');
                // 刷新页面以加载新数据
                window.location.reload();
              } 
              else {
                alert('导入的数据格式不正确，请选择正确的导出文件');
              }
            } catch (error) {
              console.error('导入数据错误:', error);
              alert('导入数据时发生错误，请检查文件格式');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
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
        return userManager.currentUser && (
          <HistoryList
            user={userManager.currentUser}
            records={historyManager.getUserRecords(userManager.currentUser.id)}
            incompleteRecords={historyManager.getUserIncompleteRecords(userManager.currentUser.id)}
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
            />
            
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