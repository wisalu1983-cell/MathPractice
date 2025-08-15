import React, { useState, useEffect, useRef } from 'react';
import { Bug, Download, Trash2, Eye, EyeOff, Filter, RefreshCw, Copy, FileText } from 'lucide-react';
import { testLogger, TestLogEntry, NetworkRequest } from '../utils/testLogger';

interface TestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestPanel: React.FC<TestPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<TestLogEntry[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'network' | 'summary'>('logs');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<'all' | TestLogEntry['type']>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | TestLogEntry['level']>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 初始化数据
    setLogs(testLogger.getAllLogs());
    setNetworkRequests(testLogger.getNetworkRequests());

    // 监听新日志
    const handleNewLog = (log: TestLogEntry) => {
      setLogs(prev => [...prev.slice(-499), log]); // 保持最新500条
    };

    testLogger.addListener(handleNewLog);

    // 定期更新网络请求
    const updateInterval = setInterval(() => {
      setNetworkRequests(testLogger.getNetworkRequests());
    }, 1000);

    return () => {
      testLogger.removeListener(handleNewLog);
      clearInterval(updateInterval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    return true;
  });

  const handleExportLogs = () => {
    const exportData = testLogger.exportLogs();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLogs = () => {
    const exportData = testLogger.exportLogs();
    navigator.clipboard.writeText(exportData).then(() => {
      alert('日志已复制到剪贴板');
    });
  };

  const handleClearLogs = () => {
    if (confirm('确定要清空所有测试日志吗？')) {
      testLogger.clearLogs();
      setLogs([]);
      setNetworkRequests([]);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogLevelColor = (level: TestLogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeColor = (type: TestLogEntry['type']) => {
    switch (type) {
      case 'sync': return 'text-green-600 bg-green-100';
      case 'network': return 'text-purple-600 bg-purple-100';
      case 'state': return 'text-indigo-600 bg-indigo-100';
      case 'user': return 'text-blue-600 bg-blue-100';
      case 'storage': return 'text-orange-600 bg-orange-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderLogsTab = () => (
    <div className="space-y-4">
      {/* 过滤器 */}
      <div className="flex items-center gap-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">过滤:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-2 py-1 text-sm border rounded"
        >
          <option value="all">所有类型</option>
          <option value="sync">同步</option>
          <option value="network">网络</option>
          <option value="state">状态</option>
          <option value="user">用户</option>
          <option value="storage">存储</option>
          <option value="error">错误</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="px-2 py-1 text-sm border rounded"
        >
          <option value="all">所有级别</option>
          <option value="debug">调试</option>
          <option value="info">信息</option>
          <option value="warn">警告</option>
          <option value="error">错误</option>
        </select>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
            autoScroll ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {autoScroll ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          自动滚动
        </button>
      </div>

      {/* 日志列表 */}
      <div className="bg-black text-green-400 p-4 rounded-lg max-h-96 overflow-y-auto font-mono text-xs">
        {filteredLogs.map((log, index) => (
          <div key={index} className="mb-2 border-b border-gray-700 pb-2">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">{formatTime(log.timestamp)}</span>
              <span className={`px-1 rounded text-xs ${getLogLevelColor(log.level)}`}>
                {log.level.toUpperCase()}
              </span>
              <span className={`px-1 rounded text-xs ${getTypeColor(log.type)}`}>
                {log.type}
              </span>
              <span className="flex-1">{log.message}</span>
            </div>
            {log.data && (
              <pre className="text-xs text-gray-400 mt-1 ml-16 overflow-x-auto">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
            {log.userId && (
              <div className="text-xs text-blue-400 mt-1 ml-16">
                User: {log.userId}
              </div>
            )}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );

  const renderNetworkTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-100 p-3 rounded-lg">
        <h4 className="font-medium mb-2">网络请求统计</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>总请求: {networkRequests.length}</div>
          <div className="text-green-600">
            成功: {networkRequests.filter(req => !req.error && (req.response?.status || 0) < 400).length}
          </div>
          <div className="text-red-600">
            失败: {networkRequests.filter(req => req.error || (req.response?.status || 0) >= 400).length}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {networkRequests.map((req, index) => (
          <div key={index} className="border rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded font-medium ${
                  req.error || (req.response?.status || 0) >= 400
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {req.method}
                </span>
                <span className="text-sm font-medium">{req.url}</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(req.timestamp)}
                {req.duration && ` (${req.duration}ms)`}
              </div>
            </div>
            
            {req.response && (
              <div className="text-sm text-gray-600 mb-1">
                状态: {req.response.status} {req.response.statusText}
              </div>
            )}
            
            {req.error && (
              <div className="text-sm text-red-600 mb-1">
                错误: {req.error}
              </div>
            )}

            {req.body && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">请求体</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2)}
                </pre>
              </details>
            )}

            {req.response?.data && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">响应数据</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {typeof req.response.data === 'string' ? req.response.data : JSON.stringify(req.response.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSummaryTab = () => {
    const summary = testLogger.generateSummary();
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">日志统计</h4>
            <div className="space-y-1 text-sm">
              <div>总日志数: {summary.totalLogs}</div>
              <div>错误数: {summary.errorCount}</div>
              <div>同步日志: {summary.logsByType.sync}</div>
              <div>网络日志: {summary.logsByType.network}</div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">网络统计</h4>
            <div className="space-y-1 text-sm">
              <div>总请求: {summary.networkRequests.total}</div>
              <div>成功: {summary.networkRequests.successful}</div>
              <div>失败: {summary.networkRequests.failed}</div>
              <div>成功率: {summary.networkRequests.total > 0 ? 
                Math.round(summary.networkRequests.successful / summary.networkRequests.total * 100) : 0}%</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">测试会话信息</h4>
          <div className="space-y-1 text-sm">
            <div>会话ID: {testLogger['sessionId']}</div>
            <div>开始时间: {summary.timeRange.start ? new Date(summary.timeRange.start).toLocaleString() : 'N/A'}</div>
            <div>结束时间: {summary.timeRange.end ? new Date(summary.timeRange.end).toLocaleString() : 'N/A'}</div>
            <div>用户代理: {navigator.userAgent}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl mx-4 transition-all duration-300 ${
        isMinimized ? 'w-80 h-20' : 'w-full max-w-6xl h-[80vh]'
      }`}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">测试面板</h2>
            <span className="text-sm text-gray-500">({filteredLogs.length} 条日志)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-100 rounded"
              title={isMinimized ? "展开" : "最小化"}
            >
              {isMinimized ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* 标签页 */}
            <div className="flex border-b">
              {[
                { id: 'logs', label: '日志', icon: FileText },
                { id: 'network', label: '网络', icon: RefreshCw },
                { id: 'summary', label: '摘要', icon: Bug },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* 内容区域 */}
            <div className="p-4 overflow-hidden">
              {activeTab === 'logs' && renderLogsTab()}
              {activeTab === 'network' && renderNetworkTab()}
              {activeTab === 'summary' && renderSummaryTab()}
            </div>

            {/* 操作按钮 */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                title="复制日志到剪贴板"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
              <button
                onClick={handleExportLogs}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              <button
                onClick={handleClearLogs}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
