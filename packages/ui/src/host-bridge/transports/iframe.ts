import { BridgeError, type MessageTransport } from '../contracts';

export interface IframeTransportOptions {
  localWindow: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  peerWindow: Pick<Window, 'postMessage'>;
  targetOrigin: string;
}

export function createIframeTransport({
  localWindow,
  peerWindow,
  targetOrigin,
}: IframeTransportOptions): MessageTransport {
  let origin: string;
  try {
    origin = new URL(targetOrigin).origin;
  } catch {
    throw new BridgeError('INVALID_MESSAGE', 'An explicit iframe origin is required');
  }
  if (origin === 'null' || origin !== targetOrigin)
    throw new BridgeError('INVALID_MESSAGE', 'An exact non-opaque iframe origin is required');
  let disposed = false;
  const listeners = new Set<(event: MessageEvent<unknown>) => void>();
  const assertOpen = () => {
    if (disposed) throw new BridgeError('DISPOSED', 'The iframe transport has been disposed');
  };
  return {
    send(message) {
      assertOpen();
      peerWindow.postMessage(message, targetOrigin);
    },
    onMessage(handler) {
      assertOpen();
      const listener = (event: MessageEvent<unknown>) => {
        if (event.source === peerWindow && event.origin === targetOrigin) handler(event.data);
      };
      listeners.add(listener);
      localWindow.addEventListener('message', listener);
      return () => {
        localWindow.removeEventListener('message', listener);
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const listener of listeners) localWindow.removeEventListener('message', listener);
      listeners.clear();
    },
  };
}
