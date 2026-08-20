import { useCallback } from 'react';

import { useAppContext } from '@/context/useAppContext';

interface NotificationOptions {
  kind: 'success' | 'error' | 'info' | 'warning';
  title: string;
  subtitle: string;
}

export const useNotification = () => {
  const { addNotification, removeNotification, clearNotifications } = useAppContext();

  const showSuccess = useCallback(
    (title: string, subtitle: string) => {
      addNotification({ kind: 'success', title, subtitle });
    },
    [addNotification],
  );

  const showError = useCallback(
    (title: string, subtitle: string) => {
      addNotification({ kind: 'error', title, subtitle });
    },
    [addNotification],
  );

  const showInfo = useCallback(
    (title: string, subtitle: string) => {
      addNotification({ kind: 'info', title, subtitle });
    },
    [addNotification],
  );

  const showWarning = useCallback(
    (title: string, subtitle: string) => {
      addNotification({ kind: 'warning', title, subtitle });
    },
    [addNotification],
  );

  const showNotification = useCallback(
    ({ kind, title, subtitle }: NotificationOptions) => {
      addNotification({ kind, title, subtitle });
    },
    [addNotification],
  );

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showNotification,
    removeNotification,
    clearNotifications,
  };
};

// Made with Bob
