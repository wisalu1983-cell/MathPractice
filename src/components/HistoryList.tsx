import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Target, Calendar, ArrowLeft, Trophy, BarChart3, User, ChevronDown, X } from 'lucide-react';
import { HistoryRecord, IncompleteHistoryRecord, User as UserType } from '../types';

interface HistoryListProps {
  user: UserType;
  records: HistoryRecord[];
  incompleteRecords: IncompleteHistoryRecord[];
  onBack: () => void;
  onViewRecord: (record: HistoryRecord) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  user,
  records,
  incompleteRecords,
  onBack,
  onViewRecord
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [filterLastNDays, setFilterLastNDays] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedStartDate, setSelectedStartDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedEndDate, setSelectedEndDate] = useState<string>(''); // YYYY-MM-DD
  const [showIncomplete, setShowIncomplete] = useState<boolean>(false);

  // 将未完成记录映射为用于展示/统计的结构
  const mappedIncomplete: HistoryRecord[] = useMemo(() => {
    return incompleteRecords.map((r) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      problemType: r.problemType,
      difficulty: r.difficulty,
      totalProblems: r.totalProblems,
      correctAnswers: r.correctAnswers,
      accuracy: r.accuracy,
      totalTime: r.totalTime,
      averageTime: r.averageTime,
      problems: r.problems,
      answers: r.answers,
      answerTimes: r.answerTimes,
      score: r.score,
    }));
  }, [incompleteRecords]);

  const displayRecords = showIncomplete ? mappedIncomplete : records;

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

  const toStartOfDay = (dateStr: string) => new Date(`${dateStr}T00:00:00`).getTime();
  const toEndOfDay = (dateStr: string) => new Date(`${dateStr}T23:59:59.999`).getTime();

  const resetDateFilter = () => {
    setSelectedStartDate('');
    setSelectedEndDate('');
    setFilterLastNDays('');
  };

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayYmd = useMemo(() => formatYMD(new Date()), []);

  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay(); // 0 Sun - 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: Date; ymd: string }> = [];
    // Fill leading blanks from prev month
    for (let i = 0; i < firstWeekday; i += 1) {
      const d = new Date(year, month, 1 - (firstWeekday - i));
      days.push({ date: d, ymd: formatYMD(d) });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(year, month, d);
      days.push({ date, ymd: formatYMD(date) });
    }
    // Fill trailing blanks to complete 6 rows * 7 cols = 42 cells
    while (days.length % 7 !== 0 || days.length < 42) {
      const last = days[days.length - 1].date;
      const next = new Date(last);
      next.setDate(last.getDate() + 1);
      days.push({ date: next, ymd: formatYMD(next) });
    }
    return days;
  };

  const isSameDay = (a: string, b: string) => a && b && a === b;
  const isInRange = (ymd: string, start: string, end: string) => {
    if (!start || !end) return false;
    return toStartOfDay(ymd) >= toStartOfDay(start) && toEndOfDay(ymd) <= toEndOfDay(end);
  };

  // 预先根据题型/难度过滤，用于日历标记
  const typeDiffFiltered = useMemo(() => {
    return displayRecords.filter((record) => {
      const typeMatch = selectedType === 'all' || record.problemType === selectedType;
      const difficultyMatch = selectedDifficulty === 'all' || record.difficulty === selectedDifficulty;
      return typeMatch && difficultyMatch;
    });
  }, [displayRecords, selectedType, selectedDifficulty]);

  const dateHasRecordsSet = useMemo(() => {
    const set = new Set<string>();
    typeDiffFiltered.forEach((r) => {
      set.add(formatYMD(new Date(r.date)));
    });
    return set;
  }, [typeDiffFiltered]);

  // 当输入了“过去N天”或手动输入了范围，自动同步高亮到日历（selectedStartDate/selectedEndDate）
  useEffect(() => {
    const n = parseInt(filterLastNDays, 10);
    if (!isNaN(n) && n > 0) {
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (n - 1));

      const startYmd = formatYMD(startDate);
      const endYmd = formatYMD(endDate);
      if (selectedStartDate !== startYmd || selectedEndDate !== endYmd) {
        setSelectedStartDate(startYmd);
        setSelectedEndDate(endYmd);
        // 确保日历面板跳到包含起点的月份，增强可视反馈
        setCalendarYear(startDate.getFullYear());
        setCalendarMonth(startDate.getMonth());
      }
      return;
    }

    // 若“过去N天”为空，但手动输入了范围，保持日历显示在起点月份
    if (selectedStartDate && selectedEndDate) {
      const start = new Date(selectedStartDate);
      setCalendarYear(start.getFullYear());
      setCalendarMonth(start.getMonth());
    }
  }, [filterLastNDays, selectedStartDate, selectedEndDate]);

  // 显示浮窗时，锁定 body 滚动，避免移动端背景滚动穿透
  useEffect(() => {
    if (!showCalendar) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showCalendar]);

  // 筛选记录
  const filteredRecords = useMemo(() => {
    return typeDiffFiltered.filter((record) => {
      let dateMatch = true;

      // 过去N天
      const n = parseInt(filterLastNDays, 10);
      if (!isNaN(n) && n > 0) {
        const now = new Date();
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate.setDate(startDate.getDate() - (n - 1));
        const start = startDate.getTime();
        dateMatch = record.date >= start && record.date <= end;
      }

      // 单日 or 范围
      if (selectedStartDate && !selectedEndDate) {
        const start = toStartOfDay(selectedStartDate);
        const end = toEndOfDay(selectedStartDate);
        dateMatch = dateMatch && record.date >= start && record.date <= end;
      } else if (selectedStartDate && selectedEndDate) {
        const start = toStartOfDay(selectedStartDate);
        const end = toEndOfDay(selectedEndDate);
        dateMatch = dateMatch && record.date >= start && record.date <= end;
      }

      return dateMatch;
    });
  }, [typeDiffFiltered, filterLastNDays, selectedStartDate, selectedEndDate]);

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

        {displayRecords.length === 0 ? (
          /* 空状态 */
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">{showIncomplete ? '暂无未完成记录' : '暂无练习记录'}</h3>
            <p className="text-gray-500">{showIncomplete ? '答题时会自动保存未完成进度' : '开始你的第一次练习吧！'}</p>
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

                {/* 日期筛选（按钮+内联日历） */}
                <button
                  onClick={() => setShowCalendar((v) => !v)}
                  className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  按日期筛选
                </button>

                {/* 重置日期 */}
                <button
                  onClick={resetDateFilter}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  重置日期
                </button>

                {/* 显示未完成记录开关 */}
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showIncomplete}
                    onChange={(e) => { setSelectedRecords(new Set()); setShowIncomplete(e.target.checked); }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  显示未完成记录
                </label>

                {/* 显示筛选结果数量 */}
                <div className="text-sm text-gray-600">
                  共 {filteredRecords.length} 条记录
                </div>
              </div>

              {/* 内联日历 */}
              {showCalendar && (
                <div className="fixed inset-0 z-50">
                  {/* 背景遮罩 */}
                  <div
                    className="absolute inset-0 bg-black/30"
                    onClick={() => setShowCalendar(false)}
                  />

                  {/* 浮窗容器 */}
                  <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
                    <div
                      role="dialog"
                      aria-modal="true"
                      className="relative z-10 w-[95%] sm:w-[90%] max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 space-y-3"
                    >
                      {/* 标题与关闭 */}
                      <div className="flex items-center justify-between">
                        <div className="text-base font-semibold text-gray-800">按日期筛选</div>
                        <button
                          onClick={() => setShowCalendar(false)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          aria-label="关闭"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* 顶部范围输入 */}
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="date"
                          value={selectedStartDate}
                          onChange={(e) => { setSelectedStartDate(e.target.value); setFilterLastNDays(''); }}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-500 text-sm">至</span>
                        <input
                          type="date"
                          value={selectedEndDate}
                          onChange={(e) => { setSelectedEndDate(e.target.value); setFilterLastNDays(''); }}
                          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {/* 过去N天快捷输入（移动到顶部输入区） */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder="过去N天"
                            value={filterLastNDays}
                            onChange={(e) => setFilterLastNDays(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-24 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-500 text-sm">天（含今天）</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedStartDate('');
                            setSelectedEndDate('');
                            setFilterLastNDays('');
                          }}
                          className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
                        >
                          清除选择
                        </button>
                      </div>

                      {/* 月份导航 */}
                      <div className="flex items-center justify-between">
                        <button
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            const prev = new Date(calendarYear, calendarMonth, 1);
                            prev.setMonth(prev.getMonth() - 1);
                            setCalendarYear(prev.getFullYear());
                            setCalendarMonth(prev.getMonth());
                          }}
                        >
                          上个月
                        </button>
                        <div className="text-sm text-gray-700 font-medium">
                          {calendarYear} 年 {calendarMonth + 1} 月
                        </div>
                        <button
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                          onClick={() => {
                            const next = new Date(calendarYear, calendarMonth, 1);
                            next.setMonth(next.getMonth() + 1);
                            setCalendarYear(next.getFullYear());
                            setCalendarMonth(next.getMonth());
                          }}
                        >
                          下个月
                        </button>
                      </div>

                      {/* 星期标题 */}
                      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
                        {['日','一','二','三','四','五','六'].map((w) => (
                          <div key={w} className="py-1">周{w}</div>
                        ))}
                      </div>

                      {/* 日期网格 */}
                      <div className="grid grid-cols-7 gap-1">
                        {getMonthDays(calendarYear, calendarMonth).map(({ date, ymd }, idx) => {
                          const isCurrentMonth = date.getMonth() === calendarMonth;
                          const hasRecords = dateHasRecordsSet.has(ymd);
                          const isSelectedStart = isSameDay(ymd, selectedStartDate);
                          const isSelectedEnd = isSameDay(ymd, selectedEndDate);
                          const inRange = isInRange(ymd, selectedStartDate, selectedEndDate);
                          const isToday = ymd === todayYmd;
                          const baseClasses = `text-sm rounded-lg py-2 text-center select-none ${isCurrentMonth ? '' : 'opacity-40'}`;
                          const colorClasses = hasRecords ? 'text-gray-800' : 'text-gray-400';
                          const selectedClasses = isSelectedStart || isSelectedEnd ? 'bg-blue-500 text-white' : inRange ? 'bg-blue-100 text-blue-700' : '';
                          return (
                            <button
                              key={ymd + idx}
                              disabled={false}
                              onClick={() => {
                                // 若通过日历选择，清空“过去N天”以避免冲突
                                if (filterLastNDays) setFilterLastNDays('');
                                if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                                  setSelectedStartDate(ymd);
                                  setSelectedEndDate('');
                                } else if (selectedStartDate && !selectedEndDate) {
                                  if (toStartOfDay(ymd) < toStartOfDay(selectedStartDate)) {
                                    setSelectedStartDate(ymd);
                                  } else if (toStartOfDay(ymd) === toStartOfDay(selectedStartDate)) {
                                    // 单击同一天，视为选择单日
                                    setSelectedEndDate('');
                                  } else {
                                    setSelectedEndDate(ymd);
                                  }
                                }
                              }}
                              className={`${baseClasses} ${colorClasses} ${selectedClasses} hover:bg-gray-100`}
                              title={ymd}
                            >
                              <div className="flex flex-col items-center">
                                <span className={`${isToday && !(isSelectedStart || isSelectedEnd || inRange) ? 'w-7 h-7 flex items-center justify-center rounded-full border-2 border-blue-500' : ''}`}>
                                  {date.getDate()}
                                </span>
                                {hasRecords && (
                                  <span className="mt-1 h-1 w-5 rounded-full bg-blue-200" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                    onClick={(e) => { if (!showIncomplete) handleRecordClick(record, e); }}
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
                          {showIncomplete && (
                            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">未完成</span>
                          )}
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
                      {!showIncomplete && (
                        <div className="text-gray-400 ml-4 flex-shrink-0">
                          <span className="text-xs">点击查看详情 →</span>
                        </div>
                      )}
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