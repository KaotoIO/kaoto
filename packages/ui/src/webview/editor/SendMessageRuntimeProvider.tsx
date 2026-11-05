import { PropsWithChildren, useMemo } from 'react';

import { SendMessageModal } from '../../components/Visualization/Canvas/SendMessageModal';
import { useHostSendMessage } from '../../host-bridge/react/use-host-send-message';
import { SendMessageModalProvider } from '../../providers/send-message-modal.provider';

export const SendMessageRuntimeProvider = ({ children }: PropsWithChildren) => {
  const { snapshot, send } = useHostSendMessage();
  const runtime = useMemo(() => ({ targets: snapshot.targets, send }), [snapshot.targets, send]);
  return (
    <SendMessageModalProvider runtime={runtime} enabled={snapshot.supported}>
      {children}
      <SendMessageModal />
    </SendMessageModalProvider>
  );
};
