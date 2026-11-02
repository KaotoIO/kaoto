import { useMemo } from 'react';

import { ValidationNotification } from '../contracts';
import { useHostBus } from './context';

export function useHostNotifications() {
  const bus = useHostBus();
  return useMemo(
    () => ({
      sendNotifications: (path: string, notifications: ValidationNotification[]): void => {
        bus.emit('editor:validation:updated', { path, notifications });
      },
      showNotification: (message: string, type: 'info' | 'warning' | 'error'): void => {
        bus.emit('editor:notification:raised', { message, type });
      },
    }),
    [bus],
  );
}
