import React, { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { UserAction } from '../types';
import { useOnlineAuth } from '../hooks/useOnlineAuth';
import { getProfile, updateProfileName } from '../services/auth';

interface UserInfoProps {
  userName: string;
  isLoggedIn: boolean;
  isDeveloper: boolean;
  onUserAction: (action: UserAction) => void;
  onGenerateTestData?: () => void;
  onShowOnlineAuth?: () => void;
  onSyncNow?: () => void;
  onShowTestPanel?: () => void;
  onShowSimplifiedTestPanel?: () => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  userName,
  isLoggedIn,
  isDeveloper,
  onUserAction,
  onGenerateTestData,
  onShowOnlineAuth,
  onSyncNow,
  onShowTestPanel,
  onShowSimplifiedTestPanel
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const online = useOnlineAuth();
  const isDev = online.isDeveloper || isDeveloper;
  const isReallyOnline = online.user && (typeof navigator !== 'undefined' ? navigator.onLine : true);

  // 拉取在线昵称
  React.useEffect(() => {
    if (isLoggedIn && online.user) {
      // 如果没有传入用户名，才主动获取，避免与App.tsx重复请求
      if (!userName || userName === 'Online User') {
        let mounted = true;
        getProfile(online.user.id)
          .then(p => {
            if (!mounted) return;
            setDisplayName(p?.name ?? null);
          })
          .catch(() => {});
        return () => { mounted = false; };
      } else {
        setDisplayName(userName);
      }
    } else {
      setDisplayName(null);
    }
  }, [online.user, userName, isLoggedIn]);

  const handleActionClick = (action: UserAction) => {
    setShowDropdown(false);
    onUserAction(action);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        {/* 用户信息显示 */}
        <div className="flex items-center bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200 relative">
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isReallyOnline ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium text-gray-700 ${isDev ? 'underline' : ''}`}>
            {online.user ? (displayName || '未命名') : userName}
          </span>
        </div>

        {/* 用户管理按钮 */}
        <button
          onClick={toggleDropdown}
          className="flex items-center bg-white hover:bg-gray-50 rounded-lg px-3 py-2 shadow-sm border border-gray-200 transition-colors duration-200"
        >
          <Settings className="w-4 h-4 text-gray-600 mr-1" />
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* 下拉菜单 */}
      {showDropdown && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* 下拉菜单内容 */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {/* 在线账户区域 */}
              {online.user ? (
                <>
                  {/* 查看记录 */}
                  <button
                    onClick={() => handleActionClick('viewHistory')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">📊</span>
                    查看记录
                  </button>

                  {/* 手动同步 */}
                  <button
                    onClick={() => { setShowDropdown(false); onSyncNow?.(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔄</span>
                    手动同步
                  </button>

                  {/* 修改昵称 */}
                  <button
                    onClick={async () => {
                      const next = window.prompt('请输入新的显示昵称（2-20个字符）', displayName || '');
                      if (next == null) return;
                      const trimmed = next.trim();
                      if (!trimmed) return;
                      try {
                        await updateProfileName(online.user!.id, trimmed);
                        setDisplayName(trimmed);
                        setShowDropdown(false);
                        // 触发一次 getProfile 以确认已写入云端
                        try {
                          await getProfile(online.user!.id);
                        } catch {}
                      } catch (e) {
                        // 失败静默，避免打断流程
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">✏️</span>
                    修改昵称
                  </button>

                  {/* 切换账号：打开登录弹窗，由用户选择最近邮箱并输入密码 */}
                  <button
                    onClick={() => { setShowDropdown(false); onShowOnlineAuth?.(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔄</span>
                    切换账号
                  </button>

                  {/* 退出登录 */}
                  <button
                    onClick={() => { setShowDropdown(false); online.signOut(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔐</span>
                    退出登录
                  </button>

                  {/* 测试在线数据 */}
                  {isDev && onGenerateTestData && (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onGenerateTestData();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                    >
                      <span className="mr-3">🛠️</span>
                      测试在线数据
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => { setShowDropdown(false); onShowOnlineAuth ? onShowOnlineAuth() : handleActionClick('login'); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🔐</span>
                  在线登录/注册
                </button>
              )}

              {/* 历史入口：仅当本地旧用户登录时显示；游客隐藏 */}
              {!online.user && isLoggedIn && (
                <button
                  onClick={() => handleActionClick('viewHistory')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">📊</span>
                  查看记录
                </button>
              )}

              {/* 旧本地用户入口：仅在未登录在线账号时显示 */}
              {!online.user && (
                <button
                  onClick={() => handleActionClick('switch')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">👥</span>
                  选择旧本地用户
                </button>
              )}

              {/* 开发者工具入口：基于本地开发者身份可见（在线用户的开发者工具已移到上面） */}
              {!online.user && isDev && onGenerateTestData && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onGenerateTestData();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🛠️</span>
                  生成测试数据
                </button>
              )}

              {/* 测试面板入口：开发者可见 */}
              {isDev && onShowTestPanel && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onShowTestPanel();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🐛</span>
                  测试面板
                </button>
              )}

              {/* 简化同步测试面板：开发者可见 */}
              {isDev && online.user && onShowSimplifiedTestPanel && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onShowSimplifiedTestPanel();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🔄</span>
                  同步测试
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};