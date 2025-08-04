import { useState, useCallback, useEffect } from 'react';
import { User, UserManager } from '../types';
import { useLocalStorage } from './useLocalStorage';

const DEVELOPER_USERNAME = 'whosyourdaddy';

export const useUserManager = () => {
  const [userManager, setUserManager] = useLocalStorage<UserManager>('userManager', {
    currentUser: null,
    users: []
  });

  // 确保开发者账号存在
  useEffect(() => {
    const hasDeveloperAccount = userManager.users.some(user => 
      user.name.toLowerCase() === DEVELOPER_USERNAME.toLowerCase()
    );

    if (!hasDeveloperAccount) {
      const developerUser: User = {
        id: 'dev_' + Date.now().toString(),
        name: DEVELOPER_USERNAME,
        createdAt: Date.now(),
        lastLoginAt: 0,
        isDeveloper: true
      };

      setUserManager(prev => ({
        ...prev,
        users: [...prev.users, developerUser]
      }));
    }
  }, [userManager.users, setUserManager]);

  // 创建新用户
  const createUser = useCallback((name: string): User | null => {
    if (!name.trim()) return null;
    
    // 检查用户名是否已存在
    const existingUser = userManager.users.find(user => user.name.toLowerCase() === name.toLowerCase());
    if (existingUser) return null;

    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    };

    setUserManager(prev => ({
      currentUser: newUser,
      users: [...prev.users, newUser]
    }));

    return newUser;
  }, [userManager.users, setUserManager]);

  // 登录用户
  const loginUser = useCallback((userId: string): boolean => {
    const user = userManager.users.find(u => u.id === userId);
    if (!user) return false;

    const updatedUser = {
      ...user,
      lastLoginAt: Date.now()
    };

    setUserManager(prev => ({
      currentUser: updatedUser,
      users: prev.users.map(u => u.id === userId ? updatedUser : u)
    }));

    return true;
  }, [userManager.users, setUserManager]);

  // 切换用户（登出当前用户）
  const switchUser = useCallback(() => {
    setUserManager(prev => ({
      ...prev,
      currentUser: null
    }));
  }, [setUserManager]);

  // 删除用户
  const deleteUser = useCallback((userId: string): boolean => {
    const userToDelete = userManager.users.find(u => u.id === userId);
    
    // 防止删除开发者账号
    if (userToDelete?.isDeveloper) {
      return false;
    }

    if (userManager.currentUser?.id === userId) {
      // 如果删除的是当前用户，先登出
      switchUser();
    }

    setUserManager(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId)
    }));

    return true;
  }, [userManager.currentUser, userManager.users, setUserManager, switchUser]);

  // 获取用户显示名称
  const getCurrentUserName = useCallback((): string => {
    return userManager.currentUser?.name || 'Guest';
  }, [userManager.currentUser]);

  // 检查是否已登录
  const isLoggedIn = useCallback((): boolean => {
    return userManager.currentUser !== null;
  }, [userManager.currentUser]);

  // 检查当前用户是否为开发者
  const isDeveloper = useCallback((): boolean => {
    return userManager.currentUser?.isDeveloper === true;
  }, [userManager.currentUser]);

  return {
    currentUser: userManager.currentUser,
    users: userManager.users,
    createUser,
    loginUser,
    switchUser,
    deleteUser,
    getCurrentUserName,
    isLoggedIn,
    isDeveloper
  };
};