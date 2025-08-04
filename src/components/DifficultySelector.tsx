import React from 'react';
import { Star, Zap } from 'lucide-react';
import { Difficulty } from '../types';

interface DifficultySelectorProps {
  selectedDifficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

const difficulties = [
  { 
    level: 'basic' as Difficulty, 
    label: '基础难度', 
    icon: Star,
    color: 'bg-green-500',
    description: '适合初学者，循序渐进'
  },
  { 
    level: 'challenge' as Difficulty, 
    label: '挑战难度', 
    icon: Zap,
    color: 'bg-red-500',
    description: '提升能力，挑战自我'
  },
];

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  selectedDifficulty,
  onDifficultyChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {difficulties.map(({ level, label, icon: Icon, color, description }) => (
        <button
          key={level}
          onClick={() => onDifficultyChange(level)}
          className={`
            p-6 rounded-2xl border-3 transition-all duration-200 transform hover:scale-105 text-left
            ${selectedDifficulty === level
              ? `${color} text-white border-white shadow-lg`
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md'
            }
          `}
        >
          <div className="flex items-center mb-3">
            <Icon className="w-8 h-8 mr-3" />
            <h3 className="text-xl font-bold">{label}</h3>
          </div>
          <p className={`text-sm ${selectedDifficulty === level ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
            {description}
          </p>
        </button>
      ))}
    </div>
  );
};