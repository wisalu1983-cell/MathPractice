import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { testLogger } from '../utils/testLogger';

interface SimplifiedTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onlineUserId: string | null;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  lastRun?: number;
  logs: string[];
}

export const SimplifiedTestPanel: React.FC<SimplifiedTestPanelProps> = ({
  isOpen,
  onClose,
  isOnline,
  onlineUserId
}) => {
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: 'online-sync',
      name: 'TC-S01: 在线记录同步',
      description: '测试完成/未完成题目的实时同步',
      status: 'pending',
      logs: []
    },
    {
      id: 'multi-device',
      name: 'TC-S02: 多设备同步',
      description: '测试不同设备间的数据同步',
      status: 'pending',
      logs: []
    },
    {
      id: 'offline-sync',
      name: 'TC-S03: 离线状态同步',
      description: '测试离线记录的自动同步',
      status: 'pending',
      logs: []
    },
    {
      id: 'clear-records',
      name: 'TC-S04: 清除记录同步',
      description: '测试本机清除对云端的影响',
      status: 'pending',
      logs: []
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState<string>('online-sync');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      updateScenarioLogs();
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const updateScenarioLogs = () => {
    const allLogs = testLogger.getAllLogs();
    const recentLogs = allLogs.filter(log => Date.now() - log.timestamp < 300000); // 最近5分钟

    setScenarios(prev => prev.map(scenario => {
      const relevantLogs = getRelevantLogs(scenario.id, recentLogs);
      
      // 自动判断测试状态
      let status = scenario.status;
      if (relevantLogs.length > 0) {
        const hasError = relevantLogs.some(log => log.level === 'error');
        const hasSuccess = relevantLogs.some(log => 
          log.message.includes('flush_success') || 
          log.message.includes('sync_complete') ||
          log.message.includes('合并服务端记录完成')
        );
        
        if (hasError) {
          status = 'failed';
        } else if (hasSuccess) {
          status = 'passed';
        } else if (relevantLogs.some(log => log.message.includes('开始') || log.message.includes('start'))) {
          status = 'running';
        }
      }

      return {
        ...scenario,
        status,
        logs: relevantLogs.map(log => formatLogMessage(log)),
        lastRun: relevantLogs.length > 0 ? Math.max(...relevantLogs.map(log => log.timestamp)) : scenario.lastRun
      };
    }));
  };

  const getRelevantLogs = (scenarioId: string, logs: any[]) => {
    switch (scenarioId) {
      case 'online-sync':
        return logs.filter(log => 
          log.type === 'sync' && (
            log.message.includes('enqueue') ||
            log.message.includes('flush') ||
            log.message.includes('完成题目') ||
            log.message.includes('未完成')
          )
        );
      case 'multi-device':
        return logs.filter(log =>
          log.type === 'sync' && (
            log.message.includes('拉取') ||
            log.message.includes('pull') ||
            log.message.includes('合并') ||
            log.message.includes('merge')
          )
        );
      case 'offline-sync':
        return logs.filter(log =>
          log.type === 'sync' && (
            log.message.includes('offline') ||
            log.message.includes('离线') ||
            log.message.includes('网络') ||
            log.message.includes('queue')
          )
        );
      case 'clear-records':
        return logs.filter(log =>
          log.type === 'storage' && (
            log.message.includes('clear') ||
            log.message.includes('remove') ||
            log.message.includes('清除') ||
            log.message.includes('恢复')
          )
        );
      default:
        return [];
    }
  };

  const formatLogMessage = (log: any) => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const level = log.level.toUpperCase();
    return `[${time}] ${level}: ${log.message}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const exportTestReport = () => {
    const report = {
      testSession: {
        timestamp: Date.now(),
        userId: onlineUserId,
        networkStatus: isOnline ? 'online' : 'offline'
      },
      scenarios: scenarios.map(scenario => ({
        ...scenario,
        logs: scenario.logs
      })),
      rawLogs: testLogger.getAllLogs(),
      summary: {
        total: scenarios.length,
        passed: scenarios.filter(s => s.status === 'passed').length,
        failed: scenarios.filter(s => s.status === 'failed').length,
        pending: scenarios.filter(s => s.status === 'pending').length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-test-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetScenario = (scenarioId: string) => {
    setScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId 
        ? { ...scenario, status: 'pending', logs: [], lastRun: undefined }
        : scenario
    ));
  };

  const currentScenario = scenarios.find(s => s.id === selectedScenario);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">同步功能测试面板</h2>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <><Wifi className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600">在线</span></>
              ) : (
                <><WifiOff className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600">离线</span></>
              )}
            </div>
            {onlineUserId && (
              <span className="text-sm text-gray-500">用户: {onlineUserId}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              自动刷新
            </label>
            <button
              onClick={updateScenarioLogs}
              className="p-2 hover:bg-gray-100 rounded"
              title="手动刷新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportTestReport}
              className="p-2 hover:bg-gray-100 rounded"
              title="导出测试报告"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 测试场景列表 */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium mb-3">测试场景</h3>
              <div className="space-y-2">
                {scenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScenario === scenario.id 
                        ? 'border-blue-300 bg-blue-50'
                        : getStatusColor(scenario.status)
                    }`}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{scenario.name}</span>
                      {getStatusIcon(scenario.status)}
                    </div>
                    <p className="text-xs text-gray-600">{scenario.description}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>日志: {scenario.logs.length} 条</span>
                      {scenario.lastRun && (
                        <span>{new Date(scenario.lastRun).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 详细日志 */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{currentScenario?.name}</h3>
                  <p className="text-sm text-gray-600">{currentScenario?.description}</p>
                </div>
                <button
                  onClick={() => resetScenario(selectedScenario)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  重置
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-full overflow-y-auto">
                {currentScenario?.logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    暂无日志，开始测试后日志将自动显示在这里
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentScenario?.logs.map((log, index) => (
                      <div key={index} className="whitespace-pre-wrap">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 测试指导 */}
        <div className="border-t p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>测试提示:</strong>
            <div className="mt-1">
              {selectedScenario === 'online-sync' && '请完成几道题目，观察同步日志。包括完成整套题目和中途退出的情况。'}
              {selectedScenario === 'multi-device' && '在另一个浏览器窗口登录相同账户，做题后回到此处观察数据同步。'}
              {selectedScenario === 'offline-sync' && '断开网络连接做题，然后重新连接网络观察自动同步过程。'}
              {selectedScenario === 'clear-records' && '使用开发者工具清除本地记录，然后重新登录验证云端数据恢复。'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
