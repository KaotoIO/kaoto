import {
  BridgeError,
  type BridgeErrorCode,
  type ControlMessage,
  eventCatalog,
  type IEventBus,
  isBridgeErrorData,
  isControlMessage,
  isEventName,
  isJsonValue,
  isRequestName,
  isWireMessage,
  type JsonValue,
  type KaotoRequests,
  type MessageTransport,
  requestCatalog,
  type RequestOptions,
  type Unsubscribe,
  type WireMessage,
} from './contracts.js';
import { getEndpoint } from './event-bus.js';

export interface BridgeOptions {
  bus: IEventBus;
  transport: MessageTransport;
  handshakeTimeoutMs?: number;
}
export interface BridgeConnection {
  connect(): Promise<void>;
  dispose(): void;
}
export interface IframeTransportOptions {
  localWindow: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  peerWindow: Pick<Window, 'postMessage'>;
  targetOrigin: string;
}

const protocol = { protocol: 'kaoto-host-bridge', version: 1 } as const;
// Memory peers can signal closure directly, without adding a wire message or a public transport method.
const memoryClosures = new WeakMap<MessageTransport, (handler: () => void) => Unsubscribe>();
const noop = () => {};
function freshId(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
function bridgeError(error: unknown, code: BridgeErrorCode = 'INTERNAL_ERROR'): BridgeError {
  if (error instanceof BridgeError && isBridgeErrorData({ code: error.code, message: error.message })) return error;
  if (error instanceof Error) return new BridgeError(code, error.message);
  return new BridgeError(code, typeof error === 'string' ? error : 'Bridge operation failed');
}
function validDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// Read identity without invoking getters, including when a payload is not valid JSON.
function identify(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const fields = Object.getOwnPropertyDescriptors(value);
    return Object.fromEntries(
      ['protocol', 'version', 'kind', 'editorBootId', 'sessionId', 'id', 'name'].map((key) => [
        key,
        fields[key]?.value,
      ]),
    );
  } catch {
    return {};
  }
}
interface PendingRequest {
  name: keyof KaotoRequests;
  resolve(value: unknown): void;
  reject(error: Error): void;
  cleanup(): void;
}

export function createPostMessageBridge({
  bus,
  transport,
  handshakeTimeoutMs = 5000,
}: BridgeOptions): BridgeConnection {
  if (!validDuration(handshakeTimeoutMs)) throw new BridgeError('INVALID_MESSAGE', 'Invalid handshake deadline');
  const endpoint = getEndpoint(bus);
  let sessionId: string | undefined;
  let bootId: string | undefined;
  let nextId = 0;
  let closed = false;
  let unsubscribe = noop;
  let unsubscribeClose = noop;
  let handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  let connected: Promise<void> | undefined;
  let resolveConnection = noop;
  let rejectConnection: (error: Error) => void = noop;
  const retiredBoots = new Set<string>();
  const pending = new Map<string, PendingRequest>();
  const incoming = new Map<string, AbortController>();
  const seenRequests = new Set<string>();

  const settle = (id: string, error?: Error, payload?: unknown) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    request.cleanup();
    if (error) request.reject(error);
    else request.resolve(payload);
  };
  const retireWork = (error: Error) => {
    for (const id of pending.keys()) settle(id, error);
    for (const controller of incoming.values()) controller.abort();
    incoming.clear();
    seenRequests.clear();
  };
  const sendMessage: (message: WireMessage | ControlMessage) => unknown = transport.send.bind(transport);
  const transmit = async (message: WireMessage | ControlMessage) => {
    if (!isJsonValue(message)) throw new BridgeError('INVALID_MESSAGE', 'Cannot send non-JSON data');
    const result: unknown = await sendMessage(message);
    if (result === false) throw new BridgeError('IO_ERROR', 'The peer rejected message delivery');
  };
  const close = (error: BridgeError, rejection?: ControlMessage) => {
    if (closed) return;
    closed = true;
    clearTimeout(handshakeTimer);
    unsubscribe();
    unsubscribeClose();
    detach();
    retireWork(error);
    retiredBoots.clear();
    sessionId = undefined;
    bootId = undefined;
    rejectConnection(error);
    if (error.code !== 'DISPOSED') endpoint.report(error);
    // Deliver version rejection before closing the memory peer as well.
    if (rejection)
      void transmit(rejection)
        .catch(noop)
        .finally(() => {
          transport.dispose();
        });
    else transport.dispose();
  };
  const dispose = () => {
    close(new BridgeError('DISPOSED', 'The bridge has been disposed'));
  };
  const send = async (message: WireMessage | ControlMessage): Promise<boolean> => {
    if (closed) return false;
    try {
      await transmit(message);
      return !closed;
    } catch (error) {
      close(bridgeError(error, 'IO_ERROR'));
      return false;
    }
  };
  const completeHandshake = () => {
    clearTimeout(handshakeTimer);
    resolveConnection();
  };
  const invalid = (message: string) => new BridgeError('INVALID_MESSAGE', message);

  const receiveControl = (message: ControlMessage) => {
    if (message.kind === 'hello' && endpoint.role === 'host') {
      if (retiredBoots.has(message.editorBootId)) return;
      if (bootId !== message.editorBootId) {
        if (bootId) retiredBoots.add(bootId);
        sessionId = undefined;
        retireWork(new BridgeError('DISPOSED', 'The peer started a new session'));
        bootId = message.editorBootId;
        sessionId = freshId();
      }
      const welcomeSession = sessionId!;
      void send({ ...protocol, kind: 'welcome', editorBootId: message.editorBootId, sessionId: welcomeSession }).then(
        (sent) => {
          if (sent && sessionId === welcomeSession) completeHandshake();
        },
      );
      return;
    }
    if (endpoint.role !== 'editor' || message.editorBootId !== bootId || message.kind === 'hello') {
      endpoint.report(invalid('Unexpected handshake sender or editor boot'));
      return;
    }
    if (message.kind === 'rejected') {
      if (!sessionId) close(new BridgeError(message.error.code, message.error.message));
      return;
    }
    if (sessionId && sessionId !== message.sessionId) {
      endpoint.report(invalid('A welcome cannot replace an established editor session'));
      return;
    }
    sessionId = message.sessionId;
    completeHandshake();
  };

  const respond = (message: Extract<WireMessage, { kind: 'request' }>, payload: unknown, failure?: unknown) => {
    const error = failure === undefined ? undefined : bridgeError(failure);
    if (error) {
      void send({
        ...protocol,
        kind: 'response',
        sessionId: message.sessionId,
        id: message.id,
        name: message.name,
        ok: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      void send({
        ...protocol,
        kind: 'response',
        sessionId: message.sessionId,
        id: message.id,
        name: message.name,
        ok: true,
        payload: payload as JsonValue,
      });
    }
  };
  const receiveRequest = (message: Extract<WireMessage, { kind: 'request' }>) => {
    if (
      !isRequestName(message.name) ||
      requestCatalog[message.name].sender === endpoint.role ||
      !requestCatalog[message.name].isRequest(message.payload)
    ) {
      respond(message, null, invalid('Invalid request name, direction or payload'));
      return;
    }
    if (seenRequests.has(message.id)) return;
    seenRequests.add(message.id);
    const controller = new AbortController();
    incoming.set(message.id, controller);
    const name = message.name;
    const finish = (payload: unknown, error?: unknown) => {
      if (closed || sessionId !== message.sessionId || incoming.get(message.id) !== controller) return;
      incoming.delete(message.id);
      const failure =
        error ?? (requestCatalog[name].isResponse(payload) ? undefined : invalid('Invalid handler response'));
      respond(message, payload, failure);
    };
    void endpoint.invoke(name, message.payload, { signal: controller.signal }).then(
      (payload) => {
        finish(payload);
      },
      (error) => {
        finish(null, bridgeError(error));
      },
    );
  };
  const receiveResponse = (message: Extract<WireMessage, { kind: 'response' }>) => {
    const request = pending.get(message.id);
    if (!request) return;
    if (message.name !== request.name || (message.ok && !requestCatalog[request.name].isResponse(message.payload))) {
      settle(message.id, invalid('Response does not match its request'));
    } else if (message.ok) settle(message.id, undefined, message.payload);
    else settle(message.id, new BridgeError(message.error.code, message.error.message));
  };
  const malformedFrame = (identity: Record<string, unknown>) => {
    const error = invalid('Malformed bridge frame');
    if (identity.kind === 'response' && typeof identity.id === 'string') settle(identity.id, error);
    if (
      identity.kind === 'request' &&
      typeof identity.id === 'string' &&
      identity.id &&
      typeof identity.name === 'string' &&
      identity.name
    ) {
      void send({
        ...protocol,
        kind: 'response',
        sessionId: sessionId!,
        id: identity.id,
        name: identity.name,
        ok: false,
        error: { code: error.code, message: error.message },
      });
    }
    endpoint.report(error);
  };
  const receive = (data: unknown) => {
    if (closed) return;
    const identity = identify(data);
    if (identity.protocol !== protocol.protocol) {
      endpoint.report(invalid('Foreign or malformed protocol message'));
      return;
    }
    const incompatibleHello = identity.kind === 'hello' && endpoint.role === 'host';
    const incompatibleWelcome =
      endpoint.role === 'editor' &&
      identity.editorBootId === bootId &&
      (identity.kind === 'welcome' || identity.kind === 'rejected');
    if (
      (incompatibleHello || incompatibleWelcome) &&
      Number.isSafeInteger(identity.version) &&
      identity.version !== protocol.version &&
      typeof identity.editorBootId === 'string' &&
      identity.editorBootId &&
      isJsonValue(data)
    ) {
      const error = new BridgeError('INCOMPATIBLE_VERSION', 'Unsupported bridge protocol version');
      close(
        error,
        incompatibleHello
          ? {
              ...protocol,
              kind: 'rejected',
              editorBootId: identity.editorBootId,
              error: { code: error.code, message: error.message },
            }
          : undefined,
      );
      return;
    }
    if (isControlMessage(data)) {
      receiveControl(data);
      return;
    }
    if (!sessionId || identity.sessionId !== sessionId) {
      endpoint.report(invalid('Message does not belong to the current session'));
      return;
    }
    if (!isWireMessage(data)) {
      malformedFrame(identity);
      return;
    }
    switch (data.kind) {
      case 'request':
        receiveRequest(data);
        break;
      case 'response':
        receiveResponse(data);
        break;
      case 'cancel':
        incoming.get(data.id)?.abort();
        incoming.delete(data.id);
        break;
      case 'event':
        if (
          !isEventName(data.name) ||
          eventCatalog[data.name].sender === endpoint.role ||
          !eventCatalog[data.name].isPayload(data.payload)
        ) {
          endpoint.report(invalid('Invalid event name, direction or payload'));
        } else endpoint.dispatch(data.name, data.payload);
        break;
    }
  };

  const request = async (name: keyof KaotoRequests, payload: unknown, options?: RequestOptions): Promise<unknown> => {
    if (!sessionId || closed) throw new BridgeError('NOT_CONNECTED', 'The handshake has not completed');
    const timeoutMs = options?.timeoutMs === undefined ? requestCatalog[name].timeoutMs : options.timeoutMs;
    if (timeoutMs !== null && !validDuration(timeoutMs)) throw invalid('Invalid request deadline');
    const signal = options?.signal;
    if (signal?.aborted) throw new BridgeError('CANCELLED', 'The request was cancelled');
    const id = `${endpoint.role}:${++nextId}`;
    const requestSession = sessionId;
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cancel = (code: 'TIMEOUT' | 'CANCELLED') => {
        if (!pending.has(id)) return;
        settle(id, new BridgeError(code, code === 'TIMEOUT' ? 'The request timed out' : 'The request was cancelled'));
        void send({ ...protocol, kind: 'cancel', sessionId: requestSession, id });
      };
      const abort = () => {
        cancel('CANCELLED');
      };
      pending.set(id, {
        name,
        resolve,
        reject,
        cleanup: () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
        },
      });
      if (timeoutMs !== null)
        timer = setTimeout(() => {
          cancel('TIMEOUT');
        }, timeoutMs);
      signal?.addEventListener('abort', abort, { once: true });
      void send({ ...protocol, kind: 'request', sessionId: requestSession, id, name, payload: payload as JsonValue });
    });
  };
  const detach = endpoint.attach({
    emit(name, payload) {
      if (sessionId && !closed)
        void send({ ...protocol, kind: 'event', sessionId, name, payload: payload as JsonValue });
    },
    request,
    dispose,
  });
  return {
    connect() {
      if (closed) return Promise.reject(new BridgeError('DISPOSED', 'The bridge has been disposed'));
      if (connected) return connected;
      connected = new Promise((resolve, reject) => {
        resolveConnection = resolve;
        rejectConnection = reject;
      });
      handshakeTimer = setTimeout(() => {
        close(new BridgeError('TIMEOUT', 'The bridge handshake timed out'));
      }, handshakeTimeoutMs);
      try {
        unsubscribe = transport.onMessage(receive);
        unsubscribeClose = memoryClosures.get(transport)?.(dispose) ?? noop;
        if (endpoint.role === 'editor' && !closed) {
          bootId = freshId();
          void send({ ...protocol, kind: 'hello', editorBootId: bootId });
        }
      } catch (error) {
        close(bridgeError(error, 'IO_ERROR'));
      }
      return connected;
    },
    dispose,
  };
}

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
