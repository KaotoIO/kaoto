import type { ValidationNotification } from '@kaoto/editor-api';
import { useMemo } from 'react';

import { useHostBus } from './context';

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
