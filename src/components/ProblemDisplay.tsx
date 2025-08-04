import React, { useState, useEffect } from 'react';
import { Check, X, ArrowRight, Clock } from 'lucide-react';
import { Problem } from '../types';

interface ProblemDisplayProps {
  problem: Problem;
  problemIndex: number;
  totalProblems: number;
  onAnswer: (answer: string | number) => void;
  onNext: () => void;
  showResult: boolean;
  isCorrect: boolean | null;
  userAnswer: string | number;
}

export const ProblemDisplay: React.FC<ProblemDisplayProps> = ({
  problem,
  problemIndex,
  totalProblems,
  onAnswer,
  onNext,
  showResult,
  isCorrect,
  userAnswer,
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [quotient, setQuotient] = useState('');
  const [remainder, setRemainder] = useState('');

  useEffect(() => {
    setCurrentAnswer('');
    setSelectedChoice(null);
    setQuotient('');
    setRemainder('');
  }, [problem.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem.isMultipleChoice) {
      if (selectedChoice !== null) {
        onAnswer(selectedChoice);
      }
    } else if (problem.isDivision) {
      // 处理除法题的答案
      const quotientNum = parseInt(quotient) || 0;
      const remainderNum = parseInt(remainder) || 0;
      const answer = remainderNum === 0 ? quotientNum.toString() : `${quotientNum}……${remainderNum}`;
      onAnswer(answer);
    } else {
      if (currentAnswer.trim() !== '') {
        onAnswer(currentAnswer.trim());
      }
    }
  };

  const handleChoiceSelect = (choiceIndex: number) => {
    setSelectedChoice(choiceIndex);
    onAnswer(choiceIndex);
  };

  const canSubmit = () => {
    if (problem.isMultipleChoice) {
      return selectedChoice !== null;
    } else if (problem.isDivision) {
      return quotient.trim() !== '';
    } else {
      return currentAnswer.trim() !== '';
    }
  };

  const formatUserAnswer = (answer: string | number) => {
    if (problem.isDivision && typeof answer === 'string') {
      if (answer.includes('……')) {
        const [q, r] = answer.split('……');
        return `商: ${q}, 余数: ${r}`;
      } else {
        return `商: ${answer}, 余数: 0`;
      }
    }
    return answer;
  };

  const formatCorrectAnswer = () => {
    if (problem.isDivision) {
      if (problem.remainder === 0) {
        return `商: ${problem.quotient}, 余数: 0`;
      } else {
        return `商: ${problem.quotient}, 余数: ${problem.remainder}`;
      }
    }
    return problem.isMultipleChoice 
      ? problem.choices?.[problem.correctChoice!]
      : problem.answer;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-4xl mx-auto">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            第 {problemIndex + 1} 题 / 共 {totalProblems} 题
          </span>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            进行中
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((problemIndex + 1) / totalProblems) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 题目显示 */}
      <div className="text-center mb-8">
        <div className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-relaxed">
          {problem.question}
        </div>
        
        {problem.type === 'written' && (
          <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg mb-4">
            💡 提示：这是笔算题，建议在草稿纸上列竖式计算
          </div>
        )}

        {problem.isDivision && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
            📝 提示：请分别填写商和余数。如果能整除，余数填0或留空
          </div>
        )}
      </div>

      {!showResult ? (
        <div className="space-y-6">
          {problem.isMultipleChoice ? (
            <div className="space-y-3">
              {problem.choices?.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoiceSelect(index)}
                  className={`
                    w-full p-4 text-left rounded-xl border-2 transition-all duration-200
                    ${selectedChoice === index
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="font-medium">{String.fromCharCode(65 + index)}. {choice}</span>
                </button>
              ))}
            </div>
          ) : problem.isDivision ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">
                    商
                  </label>
                  <input
                    type="number"
                    value={quotient}
                    onChange={(e) => setQuotient(e.target.value)}
                    className="w-full text-2xl text-center p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="商"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">
                    余数
                  </label>
                  <input
                    type="number"
                    value={remainder}
                    onChange={(e) => setRemainder(e.target.value)}
                    className="w-full text-2xl text-center p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none"
                    placeholder="余数"
                    min="0"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!canSubmit()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xl font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                提交答案
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="w-full text-2xl text-center p-4 border-3 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none"
                placeholder="请输入答案"
                autoFocus
              />
              <button
                type="submit"
                disabled={!canSubmit()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xl font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              >
                提交答案
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 结果显示 */}
          <div className={`text-center p-6 rounded-2xl ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-6xl mb-4 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? (
                <div className="flex items-center justify-center">
                  <Check className="w-12 h-12" />
                  <span className="ml-3 text-2xl font-bold">正确！</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <X className="w-12 h-12" />
                  <span className="ml-3 text-2xl font-bold">错误</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-lg">
              <div>
                <span className="text-gray-600">你的答案：</span>
                <span className={`font-bold ml-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {problem.isMultipleChoice 
                    ? problem.choices?.[userAnswer as number] 
                    : formatUserAnswer(userAnswer)
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">正确答案：</span>
                <span className="font-bold text-green-600 ml-2">
                  {formatCorrectAnswer()}
                </span>
              </div>
            </div>
          </div>

          {/* 解释说明 */}
          {problem.explanation && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-2">💡 解题思路：</h4>
              <p className="text-blue-700">{problem.explanation}</p>
            </div>
          )}

          {/* 下一题按钮 */}
          <button
            onClick={onNext}
            className="w-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
          >
            {problemIndex + 1 < totalProblems ? (
              <>
                <ArrowRight className="w-6 h-6 mr-2" />
                下一题
              </>
            ) : (
              <>
                <Check className="w-6 h-6 mr-2" />
                完成练习
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};