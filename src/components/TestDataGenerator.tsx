import React, { useState } from 'react';
import { X, Database, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { generateTestRecords, generateIncompleteTestRecords } from '../utils/generateTestRecords';
import type { GameSession } from '../types';

interface TestDataGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  saveRecords: (sessions: GameSession[], userId: string) => string[];
  refreshRecords: () => boolean;
  clearUserRecords: (userId: string) => boolean;
  upsertIncompleteRecord: (session: GameSession, userId: string, overrideDate?: number) => boolean;
  clearUserIncompleteRecords: (userId: string) => boolean;
}

export const TestDataGenerator: React.FC<TestDataGeneratorProps> = ({
  isOpen,
  onClose,
  currentUserId,
  saveRecords,
  refreshRecords,
  clearUserRecords,
  upsertIncompleteRecord,
  clearUserIncompleteRecords
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [recordsPerType, setRecordsPerType] = useState<number>(10);
  const [progress, setProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [currentType, setCurrentType] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState('');
  const [generateIncomplete, setGenerateIncomplete] = useState(false);

  const handleGenerate = async () => {
    if (!currentUserId) {
      setMessage('错误：请先登录用户');
      return;
    }

    setIsGenerating(true);
    setMessage('');
    setProgress(0);
    setTotalProgress(recordsPerType * 4); // 4种题型
    setCurrentType('');
    setCurrentDifficulty('');

    try {
      if (!generateIncomplete) {
        // 生成“已完成”记录
        const recordIds = await generateTestRecords(
          currentUserId,
          saveRecords,
          recordsPerType,
          (current, total, type, difficulty) => {
            setProgress(current);
            setTotalProgress(total);
            setCurrentType(type);
            setCurrentDifficulty(difficulty);
          }
        );
        await new Promise(resolve => setTimeout(resolve, 100));
        refreshRecords();
        setMessage(`测试数据生成完成！共生成了${recordIds.length}条记录（每种题型${recordsPerType}条）`);
        setProgress(0);
        setCurrentType('');
        setCurrentDifficulty('');
      } else {
        // 生成“未完成”记录
        const all = await generateIncompleteTestRecords(
          currentUserId,
          recordsPerType,
          (current, total, type, difficulty) => {
            setProgress(current);
            setTotalProgress(total);
            setCurrentType(type);
            setCurrentDifficulty(difficulty);
          }
        );

        let generatedCount = 0;
        for (const item of all) {
          upsertIncompleteRecord(item.session, currentUserId, item.scheduledDate.getTime());
          generatedCount += 1;
          setProgress(generatedCount);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        refreshRecords();
        setMessage(`未完成记录生成完成！共生成了${generatedCount}条记录（每种题型${recordsPerType}条）`);
        setProgress(0);
        setCurrentType('');
        setCurrentDifficulty('');
      }
    } catch (error) {
      console.error('生成测试数据错误:', error);
      setMessage('生成测试数据时发生错误：' + error);
      setProgress(0);
      setCurrentType('');
      setCurrentDifficulty('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearRecords = () => {
    if (!currentUserId) {
      setMessage('错误：请先登录用户');
      return;
    }

    if (!generateIncomplete) {
      if (window.confirm('确定要清空所有“已完成”历史记录吗？此操作不可恢复。')) {
        clearUserRecords(currentUserId);
        refreshRecords();
        setMessage('已完成的历史记录已清空');
      }
    } else {
      if (window.confirm('确定要清空所有“未完成”进度吗？此操作不可恢复。')) {
        clearUserIncompleteRecords(currentUserId);
        refreshRecords();
        setMessage('未完成的记录已清空');
      }
    }
  };

  const handleRefreshRecords = () => {
    refreshRecords();
    setMessage('历史记录已刷新');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 对话框内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-gray-800">
            <Database className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold ml-3">生成测试数据</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              此功能将为当前用户生成模拟练习记录，包含：
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>口算、笔算、多步复合算式、运算律与规则各类题型</li>
                <li>基础和挑战两种难度</li>
                <li>不同的正确率（30%-100%）</li>
                <li>合理的答题时间分布</li>
                {!generateIncomplete ? (
                  <li>从今天起共{Math.ceil(recordsPerType / 2)}天，每天2条（基础+挑战）</li>
                ) : (
                  <li>生成未完成记录，显示在未完成进度列表中</li>
                )}
              </ul>
            </p>
          </div>
        </div>

        {/* 设置区域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            每种题型生成记录数：
          </label>
          <input
            type="number"
            value={recordsPerType}
            onChange={(e) => setRecordsPerType(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200"
            min="1"
            max="30"
          />
          <p className="text-xs text-gray-500 mt-1">
            建议范围：1-30条（总记录数将是这个数字的4倍）
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{generateIncomplete ? '生成未完成记录' : '生成已完成记录'}</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={generateIncomplete}
                onChange={(e) => setGenerateIncomplete(e.target.checked)}
              />
              <div className="relative w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-500 transition-colors">
                <div className={`absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white border border-gray-300 transition-all ${generateIncomplete ? 'translate-x-5' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm text-gray-600">{generateIncomplete ? '未完成' : '已完成'}</span>
            </label>
          </div>
        </div>

        {/* 进度显示 */}
        {isGenerating && (
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  生成进度
                </span>
                <span className="text-sm text-blue-600">
                  {progress}/{totalProgress}
                </span>
              </div>
              
              {/* 进度条 */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${totalProgress > 0 ? (progress / totalProgress) * 100 : 0}%` }}
                ></div>
              </div>
              
              {/* 当前状态 */}
              {currentType && (
                <div className="text-xs text-blue-600">
                  正在生成: {currentType} - {currentDifficulty}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            message.includes('错误') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {message}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-3">
          {/* 主要操作按钮 */}
          <div className="flex space-x-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`
                flex-1 py-2 px-4 rounded-lg font-medium text-white
                ${isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'}
              `}
            >
              <span className="flex items-center justify-center">
                <Database className="w-4 h-4 mr-2" />
                {isGenerating ? '生成中...' : '生成测试数据'}
              </span>
            </button>
            <button
              onClick={handleClearRecords}
              disabled={isGenerating}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-lg"
            >
              <span className="flex items-center justify-center">
                <Trash2 className="w-4 h-4 mr-2" />
                清空记录
              </span>
            </button>
          </div>
          
          {/* 刷新按钮 */}
          <button
            onClick={handleRefreshRecords}
            disabled={isGenerating}
            className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg"
          >
            <span className="flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新记录显示
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};