/**
 * 错误日志和监控工具
 * 用于收集、记录和分析同步过程中的错误
 */

export interface ErrorLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: 'sync' | 'network' | 'database' | 'auth' | 'ui';
  message: string;
  details?: any;
  userId?: string;
  clientId?: string;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface SyncMetrics {
  totalSyncAttempts: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  lastSyncTimestamp: number;
  networkErrors: number;
  dataConflicts: number;
  timeoutErrors: number;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private metrics: SyncMetrics = {
    totalSyncAttempts: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncDuration: 0,
    lastSyncTimestamp: 0,
    networkErrors: 0,
    dataConflicts: 0,
    timeoutErrors: 0,
  };
  private readonly maxLogs = 1000; // 最多保留1000条日志
  private readonly storageKey = 'errorLogs';
  private readonly metricsKey = 'syncMetrics';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 记录错误日志
   */
  log(entry: Omit<ErrorLogEntry, 'timestamp' | 'userAgent' | 'url'>): void {
    const fullEntry: ErrorLogEntry = {
      ...entry,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(fullEntry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 控制台输出（开发环境）
    if (process.env.NODE_ENV === 'development') {
      const logFn = entry.level === 'error' || entry.level === 'critical' ? console.error :
                   entry.level === 'warn' ? console.warn : console.log;
      
      logFn(`[${entry.category}] ${entry.message}`, entry.details);
    }

    // 立即保存到本地存储
    this.saveToStorage();

    // 对于严重错误，考虑发送到远程监控服务
    if (entry.level === 'critical') {
      this.reportCriticalError(fullEntry);
    }
  }

  /**
   * 记录同步指标
   */
  recordSyncAttempt(success: boolean, duration: number, errorType?: string): void {
    this.metrics.totalSyncAttempts++;
    this.metrics.lastSyncTimestamp = Date.now();

    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
      
      // 根据错误类型更新相应计数
      if (errorType?.includes('网络') || errorType?.includes('network')) {
        this.metrics.networkErrors++;
      } else if (errorType?.includes('超时') || errorType?.includes('timeout')) {
        this.metrics.timeoutErrors++;
      } else if (errorType?.includes('冲突') || errorType?.includes('conflict')) {
        this.metrics.dataConflicts++;
      }
    }

    // 更新平均同步时长
    const totalSyncs = this.metrics.successfulSyncs + this.metrics.failedSyncs;
    if (totalSyncs > 0) {
      this.metrics.averageSyncDuration = 
        ((this.metrics.averageSyncDuration * (totalSyncs - 1)) + duration) / totalSyncs;
    }

    this.saveMetricsToStorage();
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    recent: ErrorLogEntry[];
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    this.logs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    // 最近24小时的错误
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = this.logs.filter(log => log.timestamp > oneDayAgo);

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recent,
    };
  }

  /**
   * 获取同步指标
   */
  getSyncMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取健康状态评分
   */
  getHealthScore(): {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 100;

    // 检查同步成功率
    if (this.metrics.totalSyncAttempts > 0) {
      const successRate = this.metrics.successfulSyncs / this.metrics.totalSyncAttempts;
      if (successRate < 0.5) {
        score -= 30;
        issues.push('同步成功率过低');
      } else if (successRate < 0.8) {
        score -= 15;
        issues.push('同步成功率较低');
      }
    }

    // 检查网络错误频率
    if (this.metrics.networkErrors > this.metrics.totalSyncAttempts * 0.3) {
      score -= 20;
      issues.push('网络错误频繁');
    }

    // 检查数据冲突
    if (this.metrics.dataConflicts > 0) {
      score -= 15;
      issues.push('存在数据冲突');
    }

    // 检查超时错误
    if (this.metrics.timeoutErrors > this.metrics.totalSyncAttempts * 0.2) {
      score -= 20;
      issues.push('超时错误较多');
    }

    // 检查最近错误
    const recentErrors = this.getErrorStats().recent;
    const criticalErrors = recentErrors.filter(e => e.level === 'critical').length;
    if (criticalErrors > 0) {
      score -= 25;
      issues.push(`发现 ${criticalErrors} 个严重错误`);
    }

    // 确定状态
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'warning';
    else status = 'critical';

    return { score: Math.max(0, score), status, issues };
  }

  /**
   * 清理旧日志
   */
  cleanup(daysToKeep: number = 7): void {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    this.saveToStorage();
  }

  /**
   * 导出日志用于分析
   */
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      metrics: this.metrics,
      exportTime: Date.now(),
      version: '1.0',
    }, null, 2);
  }

  /**
   * 从本地存储加载数据
   */
  private loadFromStorage(): void {
    try {
      const savedLogs = localStorage.getItem(this.storageKey);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }

      const savedMetrics = localStorage.getItem(this.metricsKey);
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
      }
    } catch (error) {
      console.warn('Failed to load error logs from storage:', error);
    }
  }

  /**
   * 保存日志到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save error logs to storage:', error);
    }
  }

  /**
   * 保存指标到本地存储
   */
  private saveMetricsToStorage(): void {
    try {
      localStorage.setItem(this.metricsKey, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save sync metrics to storage:', error);
    }
  }

  /**
   * 报告严重错误到远程监控服务
   */
  private reportCriticalError(entry: ErrorLogEntry): void {
    // 在生产环境中，这里可以发送到监控服务
    // 例如: Sentry, LogRocket, 或自定义的监控端点
    
    if (process.env.NODE_ENV === 'production') {
      // TODO: 实现远程错误报告
      console.error('Critical error detected:', entry);
      
      // 示例：发送到监控端点
      // fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // }).catch(err => console.warn('Failed to report error:', err));
    }
  }
}

// 单例实例
export const errorLogger = new ErrorLogger();

// 便捷方法
export const logSyncError = (message: string, details?: any, userId?: string, clientId?: string) => {
  errorLogger.log({
    level: 'error',
    category: 'sync',
    message,
    details,
    userId,
    clientId,
    stackTrace: new Error().stack,
  });
};

export const logNetworkError = (message: string, details?: any) => {
  errorLogger.log({
    level: 'error',
    category: 'network',
    message,
    details,
    stackTrace: new Error().stack,
  });
};

export const logDataConflict = (message: string, details?: any, userId?: string, clientId?: string) => {
  errorLogger.log({
    level: 'warn',
    category: 'database',
    message,
    details,
    userId,
    clientId,
  });
};

export const logSyncSuccess = (message: string, duration: number, details?: any) => {
  errorLogger.log({
    level: 'info',
    category: 'sync',
    message,
    details: { ...details, duration },
  });
  
  errorLogger.recordSyncAttempt(true, duration);
};

export const logSyncFailure = (message: string, duration: number, errorType: string, details?: any) => {
  errorLogger.log({
    level: 'error',
    category: 'sync',
    message,
    details: { ...details, duration, errorType },
  });
  
  errorLogger.recordSyncAttempt(false, duration, errorType);
};
