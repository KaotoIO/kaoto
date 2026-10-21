import { BridgeError, isJsonValue, type MessageTransport } from '../contracts';
import { memoryClosures } from './memory-closures';

export function createMemoryTransports(): { host: MessageTransport; editor: MessageTransport } {
  let disposed = false;
  const closeListeners = new Set<() => void>();
  const hostListeners = new Set<(message: unknown) => void>();
  const editorListeners = new Set<(message: unknown) => void>();
  const assertOpen = () => {
    if (disposed) throw new BridgeError('DISPOSED', 'The memory transport has been disposed');
  };
  const endpoint = (listeners: typeof hostListeners, peer: typeof hostListeners): MessageTransport => {
    const transport: MessageTransport = {
      send(message) {
        assertOpen();
        if (!isJsonValue(message)) throw new BridgeError('INVALID_MESSAGE', 'Cannot send non-JSON data');
        const copy: unknown = JSON.parse(JSON.stringify(message));
        return new Promise<void>((resolve) => {
          queueMicrotask(() => {
            if (!disposed) {
              // Subscription changes during delivery apply to the next message.
              const snapshot = [...peer];
              for (const listener of snapshot) listener(copy);
            }
            resolve();
          });
        });
      },
      onMessage(handler) {
        assertOpen();
        listeners.add(handler);
        return () => {
          listeners.delete(handler);
        };
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        hostListeners.clear();
        editorListeners.clear();
        const snapshot = [...closeListeners];
        for (const listener of snapshot) listener();
        closeListeners.clear();
      },
    };
    memoryClosures.set(transport, (handler) => {
      assertOpen();
      closeListeners.add(handler);
      return () => {
        closeListeners.delete(handler);
      };
    });
    return transport;
  };
  return { host: endpoint(hostListeners, editorListeners), editor: endpoint(editorListeners, hostListeners) };
}
