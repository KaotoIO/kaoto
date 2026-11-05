import { useCallback, useEffect, useState } from 'react';

import type { SendMessageRequest, SendMessageRuntimeSnapshot } from '../../models/send-message-runtime';
import { useHostBus } from './context';

export function useHostSendMessage() {
  const bus = useHostBus();
  const [snapshot, setSnapshot] = useState<SendMessageRuntimeSnapshot>({ supported: false, targets: [] });
  useEffect(() => {
    let active = true;
    let updated = false;
    const unsubscribe = bus.on('host:sendMessage:targetsUpdated', (value) => {
      updated = true;
      if (active) setSnapshot(value);
    });
    void bus
      .request('editor:sendMessage:getTargets', null)
      .then((value) => {
        if (active && !updated) setSnapshot(value);
      })
      .catch(() => {
        if (active && !updated) setSnapshot({ supported: false, targets: [] });
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [bus]);
  const send = useCallback(
    async (request: SendMessageRequest) => {
      await bus.request('editor:sendMessage:send', request);
    },
    [bus],
  );
  return { snapshot, send };
}
