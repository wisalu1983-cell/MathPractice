import React, { useState } from 'react';
import { X, Play, Trash2, Settings, Database, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { ProblemType, Difficulty, GameSession } from '../types';
import { 
  generateTestData, 
  clearTestData, 
  TestDataConfig, 
  DEFAULT_TEST_CONFIG,
  GenerationProgress,
  GenerationResult,
  ClearResult
} from '../utils/generateTestRecords';

interface TestDataGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | null;
  saveRecords: (sessions: GameSession[], userId: string) => string[];
  refreshRecords: () => boolean;
  clearUserRecords: (userId: string) => boolean;
  upsertIncompleteRecord: (session: GameSession, userId: string, overrideDate?: number) => boolean;
  clearUserIncompleteRecords: (userId: string) => boolean;
  onSyncNow?: () => Promise<{ success: boolean; message: string }>;
}

export const TestDataGenerator: React.FC<TestDataGeneratorProps> = ({
  isOpen,
  onClose,
  currentUserId,
  saveRecords,
  refreshRecords,
  clearUserRecords,
  upsertIncompleteRecord,
  clearUserIncompleteRecords,
  onSyncNow
}) => {
  // 配置状态
  const [config, setConfig] = useState<TestDataConfig>(DEFAULT_TEST_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 操作状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [lastResult, setLastResult] = useState<GenerationResult | ClearResult | null>(null);

  // 处理配置变更
  const handleConfigChange = (key: keyof TestDataConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayConfigChange = (key: keyof TestDataConfig, item: any, checked: boolean) => {
    setConfig(prev => {
      const currentArray = prev[key] as any[];
      if (checked) {
        return { ...prev, [key]: [...currentArray, item] };
      } else {
        return { ...prev, [key]: currentArray.filter(x => x !== item) };
      }
    });
  };

  // 生成数据
  const handleGenerate = async () => {
    if (!currentUserId) {
      alert('请先登录用户');
      return;
    }

    if (config.problemTypes.length === 0 || config.difficulties.length === 0) {
      alert('请至少选择一种题型和难度');
      return;
    }

    setIsGenerating(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await generateTestData(
        currentUserId,
        config,
        saveRecords,
        upsertIncompleteRecord,
        onSyncNow,
        setProgress
      );

      setLastResult(result);
      
      if (result.success) {
        refreshRecords();
      }
    } catch (error) {
      console.error('生成测试数据失败:', error);
      setLastResult({
        success: false,
        completedRecords: [],
        incompleteRecords: [],
        errors: [`生成失败: ${error}`],
        totalGenerated: 0
      });
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  // 清空数据
  const handleClear = async (recordType: 'completed' | 'incomplete' | 'both') => {
    if (!currentUserId) {
      alert('请先登录用户');
      return;
    }

    const confirmMessage = {
      completed: '确定要清空所有已完成记录吗？',
      incomplete: '确定要清空所有未完成记录吗？',
      both: '确定要清空所有记录吗？'
    }[recordType];

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsClearing(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await clearTestData(
        currentUserId,
        recordType,
        clearUserRecords,
        clearUserIncompleteRecords,
        onSyncNow,
        setProgress
      );

      setLastResult(result);
      
      if (result.success) {
        refreshRecords();
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      setLastResult({
        success: false,
        clearedCompletedCount: 0,
        clearedIncompleteCount: 0,
        errors: [`清空失败: ${error}`]
      });
    } finally {
      setIsClearing(false);
      setProgress(null);
    }
  };

  // 重置配置
  const resetConfig = () => {
    setConfig(DEFAULT_TEST_CONFIG);
  };

  if (!isOpen) return null;

  const problemTypeOptions: { value: ProblemType; label: string }[] = [
    { value: 'mental', label: '口算' },
    { value: 'written', label: '笔算' },
    { value: 'mixed', label: '多步复合算式' },
    { value: 'properties', label: '运算律与规则' }
  ];

  const difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 'basic', label: '基础' },
    { value: 'challenge', label: '挑战' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">测试数据生成器</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* 基础配置 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                基础配置
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 题型选择 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">题型</label>
                  <div className="space-y-2">
                    {problemTypeOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.problemTypes.includes(option.value)}
                          onChange={(e) => handleArrayConfigChange('problemTypes', option.value, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 难度选择 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">难度</label>
                  <div className="space-y-2">
                    {difficultyOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.difficulties.includes(option.value)}
                          onChange={(e) => handleArrayConfigChange('difficulties', option.value, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 记录类型 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">记录类型</label>
                  <select
                    value={config.recordType}
                    onChange={(e) => handleConfigChange('recordType', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="completed">仅已完成记录</option>
                    <option value="incomplete">仅未完成记录</option>
                    <option value="both">已完成 + 未完成记录</option>
                  </select>
                </div>

                {/* 每个组合的记录数 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    每个组合的记录数
                    <span className="text-xs text-gray-500 ml-1">
                      (总计: {config.problemTypes.length * config.difficulties.length * config.recordsPerCombination * (config.recordType === 'both' ? 2 : 1)} 条)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={config.recordsPerCombination}
                    onChange={(e) => handleConfigChange('recordsPerCombination', parseInt(e.target.value) || 1)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 高级配置 */}
            <div className="space-y-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Settings className="w-4 h-4 mr-1" />
                高级配置 {showAdvanced ? '▲' : '▼'}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                  {/* 日期范围 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">开始日期</label>
                    <input
                      type="date"
                      value={config.dateRange.startDate.toISOString().split('T')[0]}
                      onChange={(e) => handleConfigChange('dateRange', {
                        ...config.dateRange,
                        startDate: new Date(e.target.value)
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">结束日期</label>
                    <input
                      type="date"
                      value={config.dateRange.endDate.toISOString().split('T')[0]}
                      onChange={(e) => handleConfigChange('dateRange', {
                        ...config.dateRange,
                        endDate: new Date(e.target.value)
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* 性能范围 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">正确率范围 (%)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.performanceRange.minAccuracy}
                        onChange={(e) => handleConfigChange('performanceRange', {
                          ...config.performanceRange,
                          minAccuracy: parseInt(e.target.value) || 0
                        })}
                        placeholder="最低"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="self-center">-</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.performanceRange.maxAccuracy}
                        onChange={(e) => handleConfigChange('performanceRange', {
                          ...config.performanceRange,
                          maxAccuracy: parseInt(e.target.value) || 100
                        })}
                        placeholder="最高"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">平均答题时间范围 (秒)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={config.performanceRange.minAvgTime}
                        onChange={(e) => handleConfigChange('performanceRange', {
                          ...config.performanceRange,
                          minAvgTime: parseInt(e.target.value) || 1
                        })}
                        placeholder="最短"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="self-center">-</span>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={config.performanceRange.maxAvgTime}
                        onChange={(e) => handleConfigChange('performanceRange', {
                          ...config.performanceRange,
                          maxAvgTime: parseInt(e.target.value) || 60
                        })}
                        placeholder="最长"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 分布模式 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">分布模式</label>
                    <select
                      value={config.distributionPattern}
                      onChange={(e) => handleConfigChange('distributionPattern', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="daily">按天分布</option>
                      <option value="random">随机分布</option>
                    </select>
                  </div>

                  {/* 重置配置 */}
                  <div className="flex items-end">
                    <button
                      onClick={resetConfig}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      重置为默认
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 进度显示 */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{progress.stage}</span>
                  <span className="text-gray-500">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{progress.details}</p>
              </div>
            )}

            {/* 操作结果 */}
            {lastResult && (
              <div className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  {lastResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <h4 className={`font-medium ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    操作{lastResult.success ? '成功' : '失败'}
                  </h4>
                </div>
                
                {'totalGenerated' in lastResult && (
                  <div className="mt-2 text-sm space-y-1">
                    <p>总计生成: {lastResult.totalGenerated} 条记录</p>
                    {lastResult.completedRecords.length > 0 && (
                      <p>已完成记录: {lastResult.completedRecords.length} 条</p>
                    )}
                    {lastResult.incompleteRecords.length > 0 && (
                      <p>未完成记录: {lastResult.incompleteRecords.length} 条</p>
                    )}
                  </div>
                )}

                {'clearedCompletedCount' in lastResult && (
                  <div className="mt-2 text-sm space-y-1">
                    {lastResult.clearedCompletedCount > 0 && (
                      <p>已清空完成记录: {lastResult.clearedCompletedCount} 类</p>
                    )}
                    {lastResult.clearedIncompleteCount > 0 && (
                      <p>已清空未完成记录: {lastResult.clearedIncompleteCount} 类</p>
                    )}
                  </div>
                )}

                {lastResult.syncResult && (
                  <div className="mt-2 flex items-center text-sm">
                    {lastResult.syncResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-1" />
                    )}
                    <span>云端同步: {lastResult.syncResult.message}</span>
                  </div>
                )}

                {lastResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800 mb-1">错误详情:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {lastResult.errors.map((error, index) => (
                        <li key={index} className="flex items-start">
                          <AlertCircle className="w-4 h-4 text-red-600 mr-1 mt-0.5 flex-shrink-0" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
              {/* 生成数据 */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isClearing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                生成测试数据
              </button>

              {/* 清空按钮组 */}
              <button
                onClick={() => handleClear('completed')}
                disabled={isGenerating || isClearing}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                清空已完成
              </button>

              <button
                onClick={() => handleClear('incomplete')}
                disabled={isGenerating || isClearing}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                清空未完成
              </button>

              <button
                onClick={() => handleClear('both')}
                disabled={isGenerating || isClearing}
                className="flex items-center px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                清空所有记录
              </button>

              {/* 手动同步 */}
              {onSyncNow && (
                <button
                  onClick={onSyncNow}
                  disabled={isGenerating || isClearing}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  手动同步
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};