import { useMemo } from 'react';

import { useHostBus } from './context';
import { ValidationNotification } from './contracts';

export function useHostNotifications() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      sendNotifications: (path: string, notifications: ValidationNotification[]): void => {
        bus.emit('editor:notifications:set', { path, notifications });
      },
      showNotification: (message: string, type: 'info' | 'warning' | 'error'): void => {
        bus.emit('host:notification:show', { message, type });
      },
    }),
    [bus],
  );
}
