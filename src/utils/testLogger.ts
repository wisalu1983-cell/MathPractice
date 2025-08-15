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
    console.log('[testLogger] logNetworkRequest called:', {
      method: request.method,
      url: request.url,
      hasResponse: !!request.response,
      hasError: !!request.error
    });

    const networkRequest: NetworkRequest = {
      ...request,
      timestamp: Date.now(),
    };

    this.networkRequests.push(networkRequest);
    console.log('[testLogger] Added to networkRequests, total count:', this.networkRequests.length);

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
    
    console.log('[testLogger] logNetworkRequest completed successfully');
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
    console.log('[testLogger] getNetworkRequests called, returning', this.networkRequests.length, 'requests');
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
    // 保存原始的 fetch，防止被其他代码覆盖
    const originalFetch = window.fetch;
    
    // 确保只设置一次监控
    if ((window as any).__testLoggerNetworkMonitored) {
      console.warn('[testLogger] Network monitoring already setup');
      return;
    }
    
    (window as any).__testLoggerNetworkMonitored = true;
    console.log('[testLogger] Setting up comprehensive network monitoring (fetch + XHR)');
    
    // 监控 XMLHttpRequest (Supabase 可能使用这个)
    this.setupXHRMonitoring();

    // 监控 fetch 请求
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const startTime = Date.now();
      const urlString = typeof url === 'string' ? url : url.toString();

      console.log('[testLogger] Intercepted fetch:', {
        url: urlString,
        method: options.method || 'GET',
        hasBody: !!options.body
      });

      const requestData = {
        method: options.method || 'GET',
        url: urlString,
        headers: options.headers ? this.sanitizeHeaders(options.headers) : undefined,
        body: options.body ? this.sanitizeBody(options.body) : undefined,
      };

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        console.log('[testLogger] Fetch response:', {
          url: urlString,
          status: response.status,
          duration
        });

        let responseData;
        try {
          console.log('[testLogger] Processing response data for:', urlString);
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();
          console.log('[testLogger] Response text length:', responseText.length);
          
          if (responseText.startsWith('{') || responseText.startsWith('[')) {
            responseData = JSON.parse(responseText);
            // 如果是大对象，只保留部分数据避免日志过大
            if (typeof responseData === 'object' && JSON.stringify(responseData).length > 1000) {
              responseData = '[Large response data - truncated]';
            }
          } else {
            responseData = responseText.length > 200 ? `${responseText.slice(0, 200)}...` : responseText;
          }
          console.log('[testLogger] Response data processed successfully');
        } catch (responseError) {
          console.error('[testLogger] Error processing response data:', responseError);
          responseData = '[Response data unavailable]';
        }

        console.log('[testLogger] About to log network request:', {
          url: urlString,
          status: response.status,
          duration
        });

        try {
          this.logNetworkRequest({
            ...requestData,
            response: {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
            },
            duration,
          });
          console.log('[testLogger] Network request logged successfully');
        } catch (logError) {
          console.error('[testLogger] Failed to log network request:', logError);
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('[testLogger] Fetch error:', {
          url: urlString,
          error: errorMessage,
          duration
        });

        console.log('[testLogger] About to log network error:', {
          url: urlString,
          error: errorMessage,
          duration
        });

        try {
          this.logNetworkRequest({
            ...requestData,
            duration,
            error: errorMessage,
          });
          console.log('[testLogger] Network error logged successfully');
        } catch (logError) {
          console.error('[testLogger] Failed to log network error:', logError);
        }
        
        throw error;
      }
    };
  }

  private setupXHRMonitoring(): void {
    const originalXHR = window.XMLHttpRequest;
    const self = this;
    
    console.log('[testLogger] Setting up XMLHttpRequest monitoring');
    
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      let requestData: any = {};
      
      xhr.open = function(method: string, url: string | URL, ...args: any[]) {
        requestData = {
          method: method.toUpperCase(),
          url: url.toString(),
          startTime: Date.now()
        };
        console.log('[testLogger] XHR Open:', requestData);
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(body?: any) {
        requestData.body = body;
        console.log('[testLogger] XHR Send:', { 
          url: requestData.url, 
          method: requestData.method,
          hasBody: !!body 
        });
        
        // 监听响应完成
        xhr.addEventListener('loadend', () => {
          const duration = Date.now() - requestData.startTime;
          console.log('[testLogger] XHR Response:', {
            url: requestData.url,
            status: xhr.status,
            duration
          });
          
          let responseData;
          try {
            if (xhr.responseType === '' || xhr.responseType === 'text') {
              const responseText = xhr.responseText;
              if (responseText && (responseText.startsWith('{') || responseText.startsWith('['))) {
                responseData = JSON.parse(responseText);
                if (typeof responseData === 'object' && JSON.stringify(responseData).length > 1000) {
                  responseData = '[Large response data - truncated]';
                }
              } else {
                responseData = responseText?.length > 200 ? `${responseText.slice(0, 200)}...` : responseText;
              }
            } else {
              responseData = '[Non-text response]';
            }
          } catch {
            responseData = '[Response parsing failed]';
          }
          
          // 记录网络请求
          self.logNetworkRequest({
            method: requestData.method,
            url: requestData.url,
            headers: self.getXHRHeaders(xhr),
            body: requestData.body,
            response: {
              status: xhr.status,
              statusText: xhr.statusText,
              data: responseData,
            },
            duration,
            error: xhr.status >= 400 ? `HTTP ${xhr.status}` : undefined
          });
        });
        
        return originalSend.apply(this, [body]);
      };
      
      return xhr;
    };
  }

  private getXHRHeaders(xhr: XMLHttpRequest): Record<string, string> {
    const headers: Record<string, string> = {};
    try {
      const allHeaders = xhr.getAllResponseHeaders();
      if (allHeaders) {
        allHeaders.split('\r\n').forEach(line => {
          const [key, value] = line.split(': ');
          if (key && value) {
            headers[key] = value;
          }
        });
      }
    } catch {
      // ignore
    }
    return headers;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    if (!headers) return {};
    
    const result: Record<string, string> = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        // 敏感信息脱敏
        if (key.toLowerCase().includes('authorization')) {
          result[key] = 'Bearer [REDACTED]';
        } else {
          result[key] = value;
        }
      });
    } else if (typeof headers === 'object') {
      Object.entries(headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('authorization')) {
          result[key] = 'Bearer [REDACTED]';
        } else {
          result[key] = String(value);
        }
      });
    }
    return result;
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    try {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        // 移除敏感信息
        if (parsed.password) parsed.password = '[REDACTED]';
        return parsed;
      } else if (body instanceof FormData) {
        return '[FormData]';
      } else if (body instanceof Blob) {
        return '[Blob]';
      } else {
        const sanitized = { ...body };
        if (sanitized.password) sanitized.password = '[REDACTED]';
        return sanitized;
      }
    } catch {
      return '[Unable to parse body]';
    }
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
    // 只在开发模式下输出重要日志到控制台，减少噪音
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // 只输出错误和警告，过滤掉过多的调试信息
      if (entry.level === 'error' || entry.level === 'warn') {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `[TEST-${entry.type.toUpperCase()}] ${timestamp}`;
        
        switch (entry.level) {
          case 'error':
            console.error(`%c${prefix}%c ${entry.message}`, 'color: red; font-weight: bold', 'color: red', entry.data);
            break;
          case 'warn':
            console.warn(`%c${prefix}%c ${entry.message}`, 'color: orange; font-weight: bold', 'color: orange', entry.data);
            break;
        }
      }
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
