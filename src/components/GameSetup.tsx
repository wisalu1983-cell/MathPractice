import React from 'react';
import { Play, BookOpen } from 'lucide-react';
import { ProblemType, Difficulty } from '../types';
import { ProblemTypeSelector } from './ProblemTypeSelector';
import { DifficultySelector } from './DifficultySelector';

interface GameSetupProps {
  selectedType: ProblemType;
  selectedDifficulty: Difficulty;
  onTypeChange: (type: ProblemType) => void;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onStartGame: () => void;
}

const getTypeDescription = (type: ProblemType, difficulty: Difficulty) => {
  const descriptions = {
    mental: {
      basic: '数值范围：0-1000，包含进位/借位的两位数加减法和九九乘法表内乘除法',
      challenge: '数值范围：最高10000，包含简单小数，需要运用凑整、分配律等速算技巧'
    },
    written: {
      basic: '数值范围：不超过100000，三位数乘两位数、四位数加减、三位数除以一位数',
      challenge: '数值范围：可达1000000，多位数乘除法，可能包含0，或带括号的减法'
    },
    mixed: {
      basic: '3-4个项目，一层括号，25%几率出现可化简题目',
      challenge: '4-5个项目，两层括号，可能包含小数，25%出现需要化简的题目'
    },
    properties: {
      basic: '着重交换律、结合律，判断对错、简单填空',
      challenge: '加入分配律、提公因式，比较运算、化简计算'
    }
  };
  
  return descriptions[type][difficulty];
};

export const GameSetup: React.FC<GameSetupProps> = ({
  selectedType,
  selectedDifficulty,
  onTypeChange,
  onDifficultyChange,
  onStartGame,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <BookOpen className="w-12 h-12 text-blue-500 mr-3" />
          <h1 className="text-4xl font-bold text-gray-800">小学数学练习</h1>
        </div>
        <p className="text-lg text-gray-600">选择练习类型和难度，开始你的数学之旅</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">选择练习类型</h2>
        <ProblemTypeSelector 
          selectedType={selectedType}
          onTypeChange={onTypeChange}
        />

        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">选择难度级别</h2>
        <DifficultySelector
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={onDifficultyChange}
        />

        {/* 难度说明 */}
        <div className="bg-blue-50 p-6 rounded-2xl mb-8">
          <h3 className="text-lg font-bold text-blue-800 mb-3">📋 本次练习内容</h3>
          <p className="text-blue-700 leading-relaxed">
            {getTypeDescription(selectedType, selectedDifficulty)}
          </p>
        </div>

        <button
          onClick={onStartGame}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-2xl font-bold py-6 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center shadow-lg"
        >
          <Play className="w-8 h-8 mr-3" />
          开始练习
        </button>
      </div>
    </div>
  );
};