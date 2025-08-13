import React, { useState } from 'react';
import { User, ChevronDown, Settings } from 'lucide-react';
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
  onShowImportLocalHistory?: () => void;
  onSyncNow?: () => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  userName,
  isLoggedIn,
  isDeveloper,
  onUserAction,
  onGenerateTestData,
  onShowOnlineAuth,
  onShowImportLocalHistory,
  onSyncNow
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const online = useOnlineAuth();
  const isDev = online.isDeveloper || isDeveloper;

  // 拉取在线昵称
  React.useEffect(() => {
    let mounted = true;
    if (!online.user) {
      setDisplayName(null);
      return;
    }
    getProfile(online.user.id)
      .then(p => {
        if (!mounted) return;
        setDisplayName(p?.name ?? null);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [online.user]);

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
          <div className="relative mr-2">
            <User className="w-4 h-4 text-gray-600" />
            {isDev && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-blue-100 p-0.5">
                <User className="w-3 h-3 text-blue-600" />
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">
            {online.user ? (displayName || '未命名') : userName}
            {online.user && (
              <span className="ml-2 text-xs text-blue-600">({online.user.email})</span>
            )}
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
                      } catch (e) {
                        // 失败静默，避免打断流程
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">✏️</span>
                    修改昵称
                  </button>

                  <button
                    onClick={() => { setShowDropdown(false); online.signOut(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔐</span>
                    退出在线登录（{online.user.email}）
                  </button>
                  {/* 切换账号：打开登录弹窗，由用户选择最近邮箱并输入密码 */}
                  <button
                    onClick={() => { setShowDropdown(false); onShowOnlineAuth?.(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔄</span>
                    切换账号
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); onSyncNow?.(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔄</span>
                    立即同步
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); onShowImportLocalHistory?.(); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">⬆️</span>
                    导入本地历史
                  </button>
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

              {/* 历史入口：仅当已登录在线账号或本地旧用户登录时显示；游客隐藏 */}
              {(online.user || isLoggedIn) && (
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

              {/* 开发者工具入口：基于在线/本地任一开发者身份均可见 */}
              {isDev && onGenerateTestData && (
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
            </div>
          </div>
        </>
      )}
    </div>
  );
};