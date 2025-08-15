import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 初始化测试日志器，确保网络监控在所有请求之前设置
import { testLogger } from './utils/testLogger';

// 强制初始化测试日志器（这会设置网络监控）
console.log('[main] Initializing test logger...');
testLogger.log({
  type: 'state',
  level: 'info',
  message: '应用启动，测试日志器初始化完成'
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
