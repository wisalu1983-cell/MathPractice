import React from 'react';
import { Trophy, Target, Clock, RotateCcw, Home, Calendar, Info, FileText, BarChart3, Check, X, Award, Star, ThumbsUp, TrendingDown } from 'lucide-react';
import { GameSession } from '../types';

interface ResultSummaryProps {
  session: GameSession;
  onRestart: () => void;
  onHome: () => void;
}

export const ResultSummary: React.FC<ResultSummaryProps> = ({
  session,
  onRestart,
  onHome,
}) => {
  const [activeTab, setActiveTab] = React.useState<'summary' | 'details'>('summary');
  
  const accuracy = session.totalProblems > 0 ? Math.round((session.correctAnswers / session.totalProblems) * 100) : 0;
  const timeSpent = session.endTime && session.startTime 
    ? Math.round((session.endTime - session.startTime) / 1000) 
    : 0;
  
  const getPerformanceMessage = (accuracy: number) => {
    if (accuracy >= 90) return { message: '太棒了！你是数学小天才！', icon: Award, color: 'text-yellow-500' };
    if (accuracy >= 80) return { message: '很好！继续保持！', icon: Star, color: 'text-green-500' };
    if (accuracy >= 70) return { message: '不错！还有进步空间！', icon: ThumbsUp, color: 'text-blue-500' };
    return { message: '没关系，多练习就会进步！', icon: TrendingDown, color: 'text-orange-500' };
  };

  const performance = getPerformanceMessage(accuracy);

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('zh-CN'),
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  };

  const getTypeName = (type: string) => ({
    'mental': '口算', 'written': '笔算', 'mixed': '多步复合算式', 'properties': '运算律与规则'
  })[type as keyof ReturnType<typeof getTypeName>] || type;

  const getDifficultyName = (difficulty: string) => ({
    'basic': '基础难度', 'challenge': '挑战难度'
  })[difficulty as keyof ReturnType<typeof getDifficultyName>] || difficulty;

  const startDateTime = formatDateTime(session.startTime);
  const endDateTime = session.endTime ? formatDateTime(session.endTime) : null;

  const isAnswerCorrect = (problem: any, userAnswer: string | number) => {
    if (problem.isMultipleChoice) return userAnswer === problem.correctChoice;
    const userAnswerStr = userAnswer.toString().toLowerCase().trim();
    const correctAnswerStr = problem.answer.toString().toLowerCase().trim();
    if (problem.isDivision && problem.remainder === 0) {
      const quotientOnly = problem.quotient?.toString();
      return userAnswerStr === correctAnswerStr || userAnswerStr === quotientOnly;
    }
    return userAnswerStr === correctAnswerStr;
  };

  const formatUserAnswerDisplay = (problem: any, answer: string | number) => {
    if (problem.isMultipleChoice) return problem.choices?.[answer as number] || '未选择';
    if (problem.isDivision && typeof answer === 'string') {
      return answer.includes('……') ? `商: ${answer.split('……')[0]}, 余: ${answer.split('……')[1]}` : `商: ${answer}, 余: 0`;
    }
    return answer.toString();
  };

  const formatCorrectAnswerDisplay = (problem: any) => {
    if (problem.isDivision) return `商: ${problem.quotient}, 余: ${problem.remainder}`;
    return problem.isMultipleChoice ? problem.choices?.[problem.correctChoice!] : problem.answer;
  };

  const PerformanceIcon = performance.icon;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center">
        <div className={`flex items-center justify-center mb-2 ${performance.color}`}>
          <PerformanceIcon className="w-8 h-8 mr-3" />
          <h2 className="text-3xl font-bold text-gray-800">练习完成！</h2>
        </div>
        <p className={`text-lg font-medium mb-6 ${performance.color}`}>
          {performance.message}
        </p>

        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          <button onClick={() => setActiveTab('summary')} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
            <BarChart3 className="w-5 h-5 mr-2" /> 成绩总结
          </button>
          <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${activeTab === 'details' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>
            <FileText className="w-5 h-5 mr-2" /> 答题详情
          </button>
        </div>

        {activeTab === 'summary' ? (
          <>
            <div className="bg-indigo-50 p-4 rounded-2xl mb-6 text-left">
              <h3 className="text-base font-bold text-indigo-800 mb-3 flex items-center"><Info className="w-5 h-5 mr-2" />本次练习信息</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-indigo-700">
                {[
                  { icon: Calendar, label: "练习日期", value: startDateTime.date },
                  { icon: Clock, label: "开始时间", value: startDateTime.time },
                  { icon: null, label: "📚 题型", value: getTypeName(session.problemType || '') },
                  { icon: null, label: "⭐ 难度", value: getDifficultyName(session.difficulty || '') },
                  ...(endDateTime ? [{ icon: Clock, label: "完成时间", value: endDateTime.time }] : [])
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="flex items-center">{item.icon && <item.icon className="w-4 h-4 mr-1.5" />}{item.label}</span>
                    <span className="font-medium text-indigo-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-2xl"><Trophy className="w-8 h-8 text-blue-500 mx-auto mb-1" /><div className="text-2xl font-bold text-blue-700">{session.correctAnswers}/{session.totalProblems}</div><div className="text-sm text-blue-600">答对题数</div></div>
              <div className="bg-green-50 p-4 rounded-2xl"><Target className="w-8 h-8 text-green-500 mx-auto mb-1" /><div className="text-2xl font-bold text-green-700">{accuracy}%</div><div className="text-sm text-green-600">正确率</div></div>
              <div className="bg-purple-50 p-4 rounded-2xl"><Clock className="w-8 h-8 text-purple-500 mx-auto mb-1" /><div className="text-2xl font-bold text-purple-700">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</div><div className="text-sm text-purple-600">用时</div></div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl text-left">
              <h3 className="text-base font-bold text-gray-800 mb-3">📊 本次练习分析</h3>
              <div className="space-y-1.5 text-sm text-gray-700">
                <div className="flex justify-between"><span>总题数：</span><span className="font-medium">{session.totalProblems} 题</span></div>
                <div className="flex justify-between"><span>正确题数：</span><span className="font-medium text-green-600">{session.correctAnswers} 题</span></div>
                <div className="flex justify-between"><span>错误题数：</span><span className="font-medium text-red-600">{session.totalProblems - session.correctAnswers} 题</span></div>
                <div className="flex justify-between"><span>平均用时：</span><span className="font-medium">{session.totalProblems > 0 ? (timeSpent / session.totalProblems).toFixed(1) : 0} 秒/题</span></div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto pr-2">
            {session.problems.map((problem, index) => {
              const userAnswer = session.answers[index];
              const isCorrect = userAnswer !== undefined ? isAnswerCorrect(problem, userAnswer) : false;
              const timeSpent = session.answerTimes[index] || 0;
              return (
                <div key={problem.id} className="bg-gray-50 p-3 rounded-lg text-left text-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center font-bold text-gray-700">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded mr-2">第{index + 1}题</span>
                      <span className="truncate max-w-[120px] sm:max-w-xs">{problem.question}</span>
                    </div>
                    <div className="flex items-center text-xs ml-2 flex-shrink-0">
                      <div className={`flex items-center ${isCorrect ? 'text-green-600' : 'text-red-600'} mr-2`}>
                        {isCorrect ? <Check className="w-3 h-3 mr-0.5" /> : <X className="w-3 h-3 mr-0.5" />}
                        <span className="font-medium">{isCorrect ? '正确' : '错误'}</span>
                      </div>
                      <div className="flex items-center text-gray-500"><Clock className="w-3 h-3 mr-0.5" />{timeSpent}s</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-xs bg-white p-2 rounded">
                    <div>
                      <span className="text-gray-500">你的答案:</span>
                      <div className={`font-semibold break-all ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {userAnswer !== undefined ? formatUserAnswerDisplay(problem, userAnswer) : '未作答'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">正确答案:</span>
                      <div className="font-semibold text-green-600 break-all">
                        {formatCorrectAnswerDisplay(problem)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button onClick={onRestart} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 mr-2" />再练一次
          </button>
          <button onClick={onHome} className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center">
            <Home className="w-5 h-5 mr-2" />返回首页
          </button>
        </div>
      </div>
    </div>
  );
};
