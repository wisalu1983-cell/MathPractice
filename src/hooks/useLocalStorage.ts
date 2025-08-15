import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      if (value instanceof Function) {
        setStoredValue(prev => {
          const valueToStore = (value as (val: T) => T)(prev);
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (storageError) {
            console.error(`Error setting localStorage key "${key}":`, storageError);
            // 如果是配额超出错误，尝试清理一些数据
            if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
              console.warn('localStorage quota exceeded, attempting to free space...');
              // 可以在这里添加清理逻辑，比如删除旧的数据
            }
          }
          return valueToStore;
        });
      } else {
        setStoredValue(value);
        try {
          window.localStorage.setItem(key, JSON.stringify(value));
        } catch (storageError) {
          console.error(`Error setting localStorage key "${key}":`, storageError);
          // 如果是配额超出错误，尝试清理一些数据
          if (storageError instanceof Error && storageError.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, attempting to free space...');
            // 可以在这里添加清理逻辑，比如删除旧的数据
          }
        }
      }
    } catch (error) {
      console.error(`Error in setValue for localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}