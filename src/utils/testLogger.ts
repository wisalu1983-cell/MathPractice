/**
 * 测试专用日志工具
 * 用于测试过程中收集详细的调试信息和网络请求数据
 */

export interface TestLogEntry {
  timestamp: number;
  type: 'sync' | 'network' | 'state' | 'user' | 'storage' | 'error';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
}

export interface NetworkRequest {
  timestamp: number;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  response?: {
    status: number;
    statusText: string;
    data?: any;
  };
  duration?: number;
  error?: string;
}

class TestLogger {
  private logs: TestLogEntry[] = [];
  private networkRequests: NetworkRequest[] = [];
  private maxLogs = 500;
  private sessionId: string;
  private listeners: ((log: TestLogEntry) => void)[] = [];

  constructor() {
    this.sessionId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.setupNetworkMonitoring();
    
    // 监听控制台输出
    this.setupConsoleMonitoring();
  }

  // 添加测试日志
  log(entry: Omit<TestLogEntry, 'timestamp' | 'sessionId'>): void {
    const logEntry: TestLogEntry = {
      ...entry,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 通知监听器
    this.listeners.forEach(listener => listener(logEntry));

    // 同时输出到控制台
    this.outputToConsole(logEntry);
  }

  // 添加监听器
  addListener(listener: (log: TestLogEntry) => void): void {
    this.listeners.push(listener);
  }

  // 移除监听器
  removeListener(listener: (log: TestLogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // 记录网络请求
  logNetworkRequest(request: Omit<NetworkRequest, 'timestamp'>): void {
    const networkRequest: NetworkRequest = {
      ...request,
      timestamp: Date.now(),
    };

    this.networkRequests.push(networkRequest);

    // 限制网络请求记录数量
    if (this.networkRequests.length > 100) {
      this.networkRequests = this.networkRequests.slice(-100);
    }

    // 记录到测试日志
    this.log({
      type: 'network',
      level: request.error ? 'error' : 'info',
      message: `${request.method} ${request.url}${request.error ? ' - ERROR' : ''}`,
      data: {
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
        },
        response: request.response,
        duration: request.duration,
        error: request.error,
      },
    });
  }

  // 记录状态变化
  logStateChange(component: string, oldState: any, newState: any, userId?: string): void {
    this.log({
      type: 'state',
      level: 'debug',
      message: `${component} 状态变化`,
      data: {
        component,
        oldState,
        newState,
        changes: this.getStateChanges(oldState, newState),
      },
      userId,
    });
  }

  // 记录用户操作
  logUserAction(action: string, details?: any, userId?: string): void {
    this.log({
      type: 'user',
      level: 'info',
      message: `用户操作: ${action}`,
      data: {
        action,
        details,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      userId,
    });
  }

  // 记录存储操作
  logStorageOperation(operation: 'get' | 'set' | 'remove', key: string, value?: any, userId?: string): void {
    this.log({
      type: 'storage',
      level: 'debug',
      message: `存储操作: ${operation} ${key}`,
      data: {
        operation,
        key,
        value: operation === 'get' ? value : (typeof value === 'object' ? '[Object]' : value),
        storageSize: this.getStorageSize(),
      },
      userId,
    });
  }

  // 记录同步过程
  logSyncProcess(phase: string, details: any, userId?: string): void {
    this.log({
      type: 'sync',
      level: 'info',
      message: `同步阶段: ${phase}`,
      data: {
        phase,
        details,
        onlineStatus: navigator.onLine,
        timestamp: Date.now(),
      },
      userId,
    });
  }

  // 获取所有日志
  getAllLogs(): TestLogEntry[] {
    return [...this.logs];
  }

  // 获取网络请求
  getNetworkRequests(): NetworkRequest[] {
    return [...this.networkRequests];
  }

  // 获取特定类型的日志
  getLogsByType(type: TestLogEntry['type']): TestLogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  // 获取特定时间范围的日志
  getLogsByTimeRange(startTime: number, endTime: number): TestLogEntry[] {
    return this.logs.filter(log => log.timestamp >= startTime && log.timestamp <= endTime);
  }

  // 导出日志
  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs,
      networkRequests: this.networkRequests,
      summary: this.generateSummary(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  // 清空日志
  clearLogs(): void {
    this.logs = [];
    this.networkRequests = [];
    
    this.log({
      type: 'sync',
      level: 'info',
      message: '测试日志已清空',
      data: { sessionId: this.sessionId },
    });
  }

  // 生成测试摘要
  generateSummary(): any {
    const syncLogs = this.getLogsByType('sync');
    const networkLogs = this.getLogsByType('network');
    const errorLogs = this.logs.filter(log => log.level === 'error');

    return {
      totalLogs: this.logs.length,
      logsByType: {
        sync: syncLogs.length,
        network: networkLogs.length,
        state: this.getLogsByType('state').length,
        user: this.getLogsByType('user').length,
        storage: this.getLogsByType('storage').length,
        error: this.getLogsByType('error').length,
      },
      errorCount: errorLogs.length,
      networkRequests: {
        total: this.networkRequests.length,
        successful: this.networkRequests.filter(req => !req.error && req.response?.status < 400).length,
        failed: this.networkRequests.filter(req => req.error || (req.response?.status >= 400)).length,
      },
      timeRange: {
        start: this.logs.length > 0 ? Math.min(...this.logs.map(log => log.timestamp)) : 0,
        end: this.logs.length > 0 ? Math.max(...this.logs.map(log => log.timestamp)) : 0,
      },
    };
  }

  // 私有方法

  private setupNetworkMonitoring(): void {
    // 监控 fetch 请求
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const startTime = Date.now();

      const requestData = {
        method: options.method || 'GET',
        url: url.toString(),
        headers: options.headers,
        body: options.body,
      };

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        let responseData;
        try {
          const clonedResponse = response.clone();
          responseData = await clonedResponse.text();
          if (responseData.startsWith('{') || responseData.startsWith('[')) {
            responseData = JSON.parse(responseData);
          }
        } catch {
          responseData = '[Response data unavailable]';
        }

        this.logNetworkRequest({
          ...requestData,
          response: {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          },
          duration,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logNetworkRequest({
          ...requestData,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    };
  }

  private setupConsoleMonitoring(): void {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // 监控 console.error
    console.error = (...args) => {
      originalConsole.error(...args);
      this.log({
        type: 'error',
        level: 'error',
        message: 'Console Error: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        data: args,
        stackTrace: new Error().stack,
      });
    };

    // 监控 console.warn
    console.warn = (...args) => {
      originalConsole.warn(...args);
      this.log({
        type: 'error',
        level: 'warn',
        message: 'Console Warning: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        data: args,
      });
    };
  }

  private outputToConsole(entry: TestLogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[TEST-${entry.type.toUpperCase()}] ${timestamp}`;
    
    switch (entry.level) {
      case 'error':
        console.error(`%c${prefix}%c ${entry.message}`, 'color: red; font-weight: bold', 'color: red', entry.data);
        break;
      case 'warn':
        console.warn(`%c${prefix}%c ${entry.message}`, 'color: orange; font-weight: bold', 'color: orange', entry.data);
        break;
      case 'info':
        console.info(`%c${prefix}%c ${entry.message}`, 'color: blue; font-weight: bold', 'color: blue', entry.data);
        break;
      case 'debug':
        console.log(`%c${prefix}%c ${entry.message}`, 'color: gray; font-weight: bold', 'color: gray', entry.data);
        break;
    }
  }

  private getStateChanges(oldState: any, newState: any): any {
    if (typeof oldState !== 'object' || typeof newState !== 'object') {
      return { old: oldState, new: newState };
    }

    const changes: any = {};
    const allKeys = new Set([...Object.keys(oldState || {}), ...Object.keys(newState || {})]);

    for (const key of allKeys) {
      if (oldState[key] !== newState[key]) {
        changes[key] = { old: oldState[key], new: newState[key] };
      }
    }

    return changes;
  }

  private getStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    return total;
  }
}

// 全局测试日志实例
export const testLogger = new TestLogger();

// 便捷方法
export const logUserAction = (action: string, details?: any, userId?: string) => {
  testLogger.logUserAction(action, details, userId);
};

export const logSyncProcess = (phase: string, details: any, userId?: string) => {
  testLogger.logSyncProcess(phase, details, userId);
};

export const logStateChange = (component: string, oldState: any, newState: any, userId?: string) => {
  testLogger.logStateChange(component, oldState, newState, userId);
};

export const logStorageOperation = (operation: 'get' | 'set' | 'remove', key: string, value?: any, userId?: string) => {
  testLogger.logStorageOperation(operation, key, value, userId);
};
