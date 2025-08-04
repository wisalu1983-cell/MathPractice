import React, { useState, useMemo } from 'react';
import { Clock, Target, Calendar, ArrowLeft, Trophy, BarChart3, User, ChevronDown, X } from 'lucide-react';
import { HistoryRecord, User as UserType, ProblemType, Difficulty } from '../types';

interface HistoryListProps {
  user: UserType;
  records: HistoryRecord[];
  onBack: () => void;
  onViewRecord: (record: HistoryRecord) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  user,
  records,
  onBack,
  onViewRecord
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const getTypeName = (type: string) => ({
    'mental': '口算',
    'written': '笔算', 
    'mixed': '多步复合算式',
    'properties': '运算律与规则'
  })[type as keyof ReturnType<typeof getTypeName>] || type;

  const getDifficultyName = (difficulty: string) => ({
    'basic': '基础',
    'challenge': '挑战'
  })[difficulty as keyof ReturnType<typeof getDifficultyName>] || difficulty;

  const getDifficultyColor = (difficulty: string) => {
    return difficulty === 'challenge' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 80) return 'text-blue-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 筛选记录
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const typeMatch = selectedType === 'all' || record.problemType === selectedType;
      const difficultyMatch = selectedDifficulty === 'all' || record.difficulty === selectedDifficulty;
      return typeMatch && difficultyMatch;
    });
  }, [records, selectedType, selectedDifficulty]);

  // 用于统计的记录（选中的记录或所有记录）
  const recordsForStats = useMemo(() => {
    if (selectedRecords.size === 0) {
      return filteredRecords;
    }
    return filteredRecords.filter(record => selectedRecords.has(record.id));
  }, [filteredRecords, selectedRecords]);

  // 统计信息
  const stats = useMemo(() => {
    if (recordsForStats.length === 0) {
      return {
        totalSessions: 0,
        averageAccuracy: 0,
        averageTime: 0,
        totalAccuracy: 0
      };
    }

    const totalSessions = recordsForStats.length;
    const totalAccuracy = recordsForStats.reduce((sum, r) => sum + r.accuracy, 0);
    const averageAccuracy = Math.round(totalAccuracy / totalSessions);
    const totalTime = recordsForStats.reduce((sum, r) => sum + r.totalTime, 0);
    const averageTime = Math.round(totalTime / totalSessions);

    return {
      totalSessions,
      averageAccuracy,
      averageTime,
      totalAccuracy: averageAccuracy
    };
  }, [recordsForStats]);

  const typeOptions = [
    { value: 'all', label: '全部题型' },
    { value: 'mental', label: '口算' },
    { value: 'written', label: '笔算' },
    { value: 'mixed', label: '多步复合算式' },
    { value: 'properties', label: '运算律与规则' }
  ];

  const difficultyOptions = [
    { value: 'all', label: '全部难度' },
    { value: 'basic', label: '基础难度' },
    { value: 'challenge', label: '挑战难度' }
  ];

  // 处理记录选择
  const handleRecordSelect = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // 取消所有选择
  const handleUnselectAll = () => {
    setSelectedRecords(new Set());
  };

  // 全选当前筛选的记录
  const handleSelectAll = () => {
    const allIds = new Set(filteredRecords.map(record => record.id));
    setSelectedRecords(allIds);
  };

  const handleRecordClick = (record: HistoryRecord, e: React.MouseEvent) => {
    // 如果点击的是复选框，不触发查看详情
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    onViewRecord(record);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <User className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user.name} 的练习记录</h1>
                <p className="text-sm text-gray-600">查看你的学习历程</p>
              </div>
            </div>
          </div>
        </div>

        {records.length === 0 ? (
          /* 空状态 */
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无练习记录</h3>
            <p className="text-gray-500">开始你的第一次练习吧！</p>
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl text-center">
                <Trophy className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-blue-700">{stats.totalSessions}</div>
                <div className="text-sm text-blue-600">练习次数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl text-center">
                <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-green-700">{stats.averageAccuracy}%</div>
                <div className="text-sm text-green-600">平均正确率</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl text-center">
                <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-purple-700">{formatTime(stats.averageTime)}</div>
                <div className="text-sm text-purple-600">平均用时</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl text-center">
                <BarChart3 className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-xl font-bold text-yellow-700">{stats.totalAccuracy}%</div>
                <div className="text-sm text-yellow-600">平均正确率</div>
              </div>
            </div>

            {/* 筛选器和操作按钮 */}
            <div className="mb-6 space-y-4">
              {/* 下拉菜单筛选器 */}
              <div className="flex flex-wrap items-center gap-4">
                {/* 题型筛选 */}
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* 难度筛选 */}
                <div className="relative">
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  >
                    {difficultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* 显示筛选结果数量 */}
                <div className="text-sm text-gray-600">
                  共 {filteredRecords.length} 条记录
                </div>
              </div>

              {/* 选择操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  disabled={filteredRecords.length === 0}
                >
                  全选
                </button>
                <button
                  onClick={handleUnselectAll}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200 flex items-center"
                  disabled={selectedRecords.size === 0}
                >
                  <X className="w-4 h-4 mr-1" />
                  取消勾选
                </button>
                {selectedRecords.size > 0 && (
                  <div className="text-sm text-blue-600 font-medium">
                    已选择 {selectedRecords.size} 条记录
                  </div>
                )}
              </div>
            </div>

            {/* 记录列表 */}
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>没有找到符合条件的记录</p>
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={(e) => handleRecordClick(record, e)}
                    className="bg-gray-50 hover:bg-gray-100 p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center">
                      {/* 复选框 */}
                      <div className="mr-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={(e) => handleRecordSelect(record.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* 记录内容 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-medium text-gray-800">
                            {getTypeName(record.problemType)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(record.difficulty)}`}>
                            {getDifficultyName(record.difficulty)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(record.date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Trophy className="w-4 h-4 mr-1" />
                            {record.correctAnswers}/{record.totalProblems}题
                          </span>
                          <span className={`flex items-center font-medium ${getAccuracyColor(record.accuracy)}`}>
                            <Target className="w-4 h-4 mr-1" />
                            {record.accuracy}%
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatTime(record.totalTime)}
                          </span>
                        </div>
                      </div>

                      {/* 查看详情指示 */}
                      <div className="text-gray-400 ml-4 flex-shrink-0">
                        <span className="text-xs">点击查看详情 →</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};