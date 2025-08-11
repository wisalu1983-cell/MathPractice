import React, { useState } from 'react';
import { X, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useOnlineAuth } from '../hooks/useOnlineAuth';

interface OnlineAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnlineAuthModal: React.FC<OnlineAuthModalProps> = ({ isOpen, onClose }) => {
  const { user, loading, error, signIn, signUp, signOut } = useOnlineAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  if (!isOpen) return null;

  const handleLogin = async () => {
    const res = await signIn(email.trim(), password);
    if (res.ok) onClose();
  };

  const handleRegister = async () => {
    const res = await signUp(email.trim(), password, displayName.trim());
    if (res.ok && !res.needsVerification) onClose();
  };

  const handleSignOut = async () => {
    const res = await signOut();
    if (res.ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">在线账户</h2>
          <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="text-sm text-gray-700">已登录：{user.email}</div>
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" /> 退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 py-2 rounded-lg ${mode === 'login' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setMode('login')}
              >登录</button>
              <button
                className={`flex-1 py-2 rounded-lg ${mode === 'register' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setMode('register')}
              >注册</button>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">昵称（可选）</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：小明"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="不少于 6 位"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</div>
            )}

            {mode === 'login' ? (
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
              >
                <LogIn className="w-4 h-4 mr-2" /> 登录
              </button>
            ) : (
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
              >
                <UserPlus className="w-4 h-4 mr-2" /> 注册
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


