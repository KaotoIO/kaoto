import { ReactNode, useCallback, useMemo, useState } from 'react';

import { AppContext, AppContextType, ErrorInfo, NotificationState } from './AppContextDefinition';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const addNotification = useCallback((notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const newNotification: NotificationState = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setNotifications((prev) => [...prev, newNotification]);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: AppContextType = useMemo(
    () => ({
      notifications,
      addNotification,
      removeNotification,
      clearNotifications,
      isLoading,
      setIsLoading,
      error,
      setError,
    }),
    [notifications, addNotification, removeNotification, clearNotifications, isLoading, setIsLoading, error, setError],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
