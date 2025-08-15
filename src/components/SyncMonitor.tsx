import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, Download, Trash2 } from 'lucide-react';
import { errorLogger } from '../utils/errorLogging';

interface SyncMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  getErrorStats: () => any;
  getSyncMetrics: () => any;
  getHealthScore: () => any;
  exportLogs: () => string;
  cleanupLogs: (days?: number) => void;
}

export const SyncMonitor: React.FC<SyncMonitorProps> = ({
  isOpen,
  onClose,
  getErrorStats,
  getSyncMetrics,
  getHealthScore,
  exportLogs,
  cleanupLogs
}) => {
  const [errorStats, setErrorStats] = useState<any>(null);
  const [syncMetrics, setSyncMetrics] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, refreshKey]);

  const refreshData = () => {
    setErrorStats(getErrorStats());
    setSyncMetrics(getSyncMetrics());
    setHealthScore(getHealthScore());
  };

  const handleExportLogs = () => {
    const logs = exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCleanupLogs = () => {
    if (confirm('确定要清理7天前的日志吗？')) {
      cleanupLogs(7);
      setRefreshKey(prev => prev + 1);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'good':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-700 bg-green-100';
      case 'good': return 'text-blue-700 bg-blue-100';
      case 'warning': return 'text-yellow-700 bg-yellow-100';
      case 'critical': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">同步监控面板</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              刷新
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* 健康状态 */}
          {healthScore && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">系统健康状态</h3>
              <div className={`p-4 rounded-lg ${getStatusColor(healthScore.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthScore.status)}
                    <span className="font-medium">
                      健康评分: {healthScore.score}/100
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {healthScore.status === 'excellent' && '优秀'}
                    {healthScore.status === 'good' && '良好'}
                    {healthScore.status === 'warning' && '警告'}
                    {healthScore.status === 'critical' && '严重'}
                  </span>
                </div>
                {healthScore.issues.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">发现的问题:</p>
                    <ul className="text-sm space-y-1">
                      {healthScore.issues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-current rounded-full"></span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* 同步指标 */}
            {syncMetrics && (
              <div>
                <h3 className="text-lg font-semibold mb-3">同步指标</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总同步次数:</span>
                    <span className="font-medium">{syncMetrics.totalSyncAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">成功次数:</span>
                    <span className="font-medium text-green-600">{syncMetrics.successfulSyncs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">失败次数:</span>
                    <span className="font-medium text-red-600">{syncMetrics.failedSyncs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">成功率:</span>
                    <span className="font-medium">
                      {syncMetrics.totalSyncAttempts > 0 
                        ? Math.round((syncMetrics.successfulSyncs / syncMetrics.totalSyncAttempts) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均耗时:</span>
                    <span className="font-medium">{Math.round(syncMetrics.averageSyncDuration)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">网络错误:</span>
                    <span className="font-medium text-orange-600">{syncMetrics.networkErrors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">数据冲突:</span>
                    <span className="font-medium text-purple-600">{syncMetrics.dataConflicts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">超时错误:</span>
                    <span className="font-medium text-red-600">{syncMetrics.timeoutErrors}</span>
                  </div>
                  {syncMetrics.lastSyncTimestamp > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">最后同步:</span>
                      <span className="font-medium text-sm">
                        {formatTime(syncMetrics.lastSyncTimestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 错误统计 */}
            {errorStats && (
              <div>
                <h3 className="text-lg font-semibold mb-3">错误统计</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">总错误数:</span>
                    <span className="font-medium">{errorStats.total}</span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">按级别分类:</p>
                    {Object.entries(errorStats.byLevel).map(([level, count]) => (
                      <div key={level} className="flex justify-between text-sm">
                        <span className={`capitalize ${
                          level === 'error' || level === 'critical' ? 'text-red-600' :
                          level === 'warn' ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {level === 'error' ? '错误' :
                           level === 'warn' ? '警告' :
                           level === 'info' ? '信息' :
                           level === 'critical' ? '严重' : level}:
                        </span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">按类别分类:</p>
                    {Object.entries(errorStats.byCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {category === 'sync' ? '同步' :
                           category === 'network' ? '网络' :
                           category === 'database' ? '数据库' :
                           category === 'auth' ? '认证' :
                           category === 'ui' ? '界面' : category}:
                        </span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      最近24小时: {errorStats.recent.length} 个错误
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 最近错误列表 */}
          {errorStats && errorStats.recent.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">最近错误 (24小时内)</h3>
              <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                {errorStats.recent.slice(0, 10).map((error: any, index: number) => (
                  <div key={index} className="p-3 border-b last:border-b-0 border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          error.level === 'error' || error.level === 'critical' 
                            ? 'bg-red-100 text-red-700'
                            : error.level === 'warn'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {error.level}
                        </span>
                        <span className="text-xs text-gray-500">{error.category}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(error.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{error.message}</p>
                    {error.clientId && (
                      <p className="text-xs text-gray-500 mt-1">Client ID: {error.clientId}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleExportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              导出日志
            </button>
            <button
              onClick={handleCleanupLogs}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <Trash2 className="w-4 h-4" />
              清理旧日志
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
