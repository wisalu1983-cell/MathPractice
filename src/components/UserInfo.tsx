import React, { useState } from 'react';
import { User, ChevronDown, Settings } from 'lucide-react';
import { UserAction } from '../types';
import { useOnlineAuth } from '../hooks/useOnlineAuth';

interface UserInfoProps {
  userName: string;
  isLoggedIn: boolean;
  isDeveloper: boolean;
  onUserAction: (action: UserAction) => void;
  onGenerateTestData?: () => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({
  userName,
  isLoggedIn,
  isDeveloper,
  onUserAction,
  onGenerateTestData
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const online = useOnlineAuth();

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
        <div className="flex items-center bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
          <User className="w-4 h-4 text-gray-600 mr-2" />
          <span className="text-sm font-medium text-gray-700">
            {userName}
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
                <button
                  onClick={() => { setShowDropdown(false); online.signOut(); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🔐</span>
                  退出在线登录（{online.user.email}）
                </button>
              ) : (
                <button
                  onClick={() => handleActionClick('login')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                >
                  <span className="mr-3">🔐</span>
                  在线登录/注册
                </button>
              )}

              {isLoggedIn ? (
                /* 已登录状态的选项 */
                <>
                  <button
                    onClick={() => handleActionClick('viewHistory')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">📊</span>
                    查看记录
                  </button>
                  <button
                    onClick={() => handleActionClick('register')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">👤</span>
                    新建用户
                  </button>
                  <button
                    onClick={() => handleActionClick('switch')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">🔄</span>
                    切换用户
                  </button>
                  {isDeveloper && onGenerateTestData && (
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
                </>
              ) : (
                /* 未登录状态的选项 */
                <>
                  <button
                    onClick={() => handleActionClick('register')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center"
                  >
                    <span className="mr-3">👤</span>
                    新建用户
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};