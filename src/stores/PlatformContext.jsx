import { createContext, useContext, useState, useEffect } from 'react';

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  // 預設讀取 localStorage，沒有則預設為 'shopify'
  const [platform, setPlatform] = useState(() => {
    return localStorage.getItem('current_platform') || 'shopify';
  });

  // 當平台改變時，寫入 localStorage
  useEffect(() => {
    localStorage.setItem('current_platform', platform);
  }, [platform]);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}