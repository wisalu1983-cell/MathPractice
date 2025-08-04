import React, { useState } from 'react';
import { X, User, UserPlus, LogIn, Users } from 'lucide-react';
import { User as UserType, UserAction } from '../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: UserAction;
  users: UserType[];
  onCreateUser: (name: string) => UserType | null;
  onLoginUser: (userId: string) => boolean;
  currentUser: UserType | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  action,
  users,
  onCreateUser,
  onLoginUser,
  currentUser
}) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDevInput, setShowDevInput] = useState(false);
  const [devInput, setDevInput] = useState('');

  const resetForm = () => {
    setUserName('');
    setError('');
    setIsLoading(false);
    setShowDevInput(false);
    setDevInput('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateUser = async () => {
    if (!userName.trim()) {
      setError('请输入用户名');
      return;
    }

    if (userName.trim().length < 2) {
      setError('用户名至少需要2个字符');
      return;
    }

    if (userName.trim().length > 20) {
      setError('用户名不能超过20个字符');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newUser = onCreateUser(userName.trim());
      if (newUser) {
        handleClose();
      } else {
        setError('用户名已存在，请选择其他用户名');
      }
    } catch (err) {
      setError('创建用户失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginUser = (userId: string) => {
    const success = onLoginUser(userId);
    if (success) {
      handleClose();
    } else {
      setError('登录失败，请重试');
    }
  };

  const handleDevAccess = () => {
    setShowDevInput(true);
    setDevInput('');
    setError('');
  };

  const handleDevLogin = () => {
    if (devInput.trim() === 'whosyourdaddy') {
      // 查找开发者账号
      const devUser = users.find(user => user.isDeveloper);
      if (devUser) {
        const success = onLoginUser(devUser.id);
        if (success) {
          handleClose();
        } else {
          setError('开发者账号登录失败');
        }
      } else {
        setError('开发者账号不存在');
      }
    } else {
      setError('访问密钥错误');
      setDevInput('');
    }
  };

  const handleDevInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDevLogin();
    } else if (e.key === 'Escape') {
      setShowDevInput(false);
      setDevInput('');
      setError('');
    }
  };

  const getModalTitle = () => {
    switch (action) {
      case 'register':
        return '新建用户';
      case 'login':
      case 'switch':
        return '选择用户';
      default:
        return '用户管理';
    }
  };

  const getModalIcon = () => {
    switch (action) {
      case 'register':
        return <UserPlus className="w-6 h-6" />;
      case 'login':
        return <LogIn className="w-6 h-6" />;
      case 'switch':
        return <Users className="w-6 h-6" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-gray-800">
            {getModalIcon()}
            <h2 className="text-xl font-bold ml-3">{getModalTitle()}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="space-y-4">
          {action === 'register' && (
            /* 新建用户表单 */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200"
                  placeholder="请输入用户名"
                  maxLength={20}
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  用户名长度为2-20个字符
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateUser}
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? '创建中...' : '创建用户'}
                </button>
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {(action === 'login' || action === 'switch') && (
            /* 用户选择列表 */
            <div className="space-y-3 relative">
              {/* 开发者访问输入框 */}
              {showDevInput && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开发者访问密钥
                  </label>
                  <input
                    type="password"
                    value={devInput}
                    onChange={(e) => setDevInput(e.target.value)}
                    onKeyDown={handleDevInputKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="请输入访问密钥"
                    autoFocus
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <button
                      onClick={() => {
                        setShowDevInput(false);
                        setDevInput('');
                        setError('');
                      }}
                      className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDevLogin}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      确认
                    </button>
                  </div>
                </div>
              )}
              
              {users.filter(user => !user.isDeveloper).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无用户</p>
                  <p className="text-xs text-gray-400 mt-1">请先创建一个用户</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    {action === 'login' ? '选择要登录的用户：' : '选择要切换到的用户：'}
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {users.filter(user => !user.isDeveloper).map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleLoginUser(user.id)}
                        disabled={currentUser?.id === user.id}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          currentUser?.id === user.id
                            ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-800">
                              {user.name}
                              {user.isDeveloper && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  开发者
                                </span>
                              )}
                              {currentUser?.id === user.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  当前用户
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              创建于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-3 pt-2 relative">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  取消
                </button>
                
                {/* 隐藏的开发者访问区域 */}

              </div>
            </div>
          )}
        </div>
        {/* 全局隐藏的开发者触发区域 */}
        {!showDevInput && (
          <div
            onClick={handleDevAccess}
            className="absolute bottom-2 right-2 w-5 h-5 cursor-pointer opacity-0 hover:opacity-10 transition-opacity duration-200"
            style={{ background: 'transparent' }}
          />
        )}
      </div>
    </div>
  );
};