import React from 'react';
import { Trophy, Target, Zap, Award } from 'lucide-react';
import { GameSession } from '../types';

interface ScoreDisplayProps {
  session: GameSession;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ session }) => {
  const accuracy = session.totalProblems > 0 ? Math.round((session.correctAnswers / session.totalProblems) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
        <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <div className="text-2xl font-bold text-gray-800">{session.score}</div>
        <div className="text-sm text-gray-600">得分</div>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
        <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <div className="text-2xl font-bold text-gray-800">{accuracy}%</div>
        <div className="text-sm text-gray-600">正确率</div>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
        <Zap className="w-8 h-8 text-orange-500 mx-auto mb-2" />
        <div className="text-2xl font-bold text-gray-800">{session.streak}</div>
        <div className="text-sm text-gray-600">连胜</div>
      </div>
      
      <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
        <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
        <div className="text-2xl font-bold text-gray-800">{session.bestStreak}</div>
        <div className="text-sm text-gray-600">最佳连胜</div>
      </div>
    </div>
  );
};