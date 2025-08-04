import React from 'react';
import { Brain, PenTool, Calculator, BookOpen } from 'lucide-react';
import { ProblemType, ProblemTypeConfig } from '../types';

interface ProblemTypeSelectorProps {
  selectedType: ProblemType;
  onTypeChange: (type: ProblemType) => void;
}

const problemTypes: ProblemTypeConfig[] = [
  { 
    type: 'mental', 
    name: '口算', 
    description: '心算练习，培养数感',
    icon: '🧠',
    color: 'bg-blue-500',
    count: 20
  },
  { 
    type: 'written', 
    name: '笔算', 
    description: '竖式计算，规范书写',
    icon: '✏️',
    color: 'bg-green-500',
    count: 10
  },
  { 
    type: 'mixed', 
    name: '多步复合算式', 
    description: '综合运算，逻辑思维',
    icon: '🔢',
    color: 'bg-purple-500',
    count: 10  // 从5题改为10题
  },
  { 
    type: 'properties', 
    name: '运算律与规则', 
    description: '运算规律，灵活应用',
    icon: '📐',
    color: 'bg-orange-500',
    count: 5
  },
];

export const ProblemTypeSelector: React.FC<ProblemTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {problemTypes.map((config) => (
        <button
          key={config.type}
          onClick={() => onTypeChange(config.type)}
          className={`
            p-6 rounded-2xl border-3 transition-all duration-200 transform hover:scale-105 text-left
            ${selectedType === config.type
              ? `${config.color} text-white border-white shadow-lg`
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md'
            }
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="text-3xl">{config.icon}</div>
            <div className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${selectedType === config.type 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'bg-gray-100 text-gray-600'
              }
            `}>
              {config.count}题
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">{config.name}</h3>
          <p className={`text-sm ${selectedType === config.type ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
            {config.description}
          </p>
        </button>
      ))}
    </div>
  );
};