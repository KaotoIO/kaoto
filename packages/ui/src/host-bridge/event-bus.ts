import {
  BridgeError,
  eventCatalog,
  type IEventBus,
  isEventName,
  isRequestName,
  type KaotoEvents,
  type KaotoRequests,
  type KaotoResponses,
  requestCatalog,
  type RequestContext,
  type RequestOptions,
} from './contracts.js';

export type EndpointRole = 'host' | 'editor';

export interface EventBusOptions {
  role: EndpointRole;
  onError: (error: Error) => void;
}

interface EndpointConnection {
  emit(event: keyof KaotoEvents, payload: unknown): void;
  request(request: keyof KaotoRequests, payload: unknown, options?: RequestOptions): Promise<unknown>;
  dispose(): void;
}

interface Endpoint {
  role: EndpointRole;
  report(error: Error): void;
  dispatch(event: keyof KaotoEvents, payload: unknown): void;
  invoke(request: keyof KaotoRequests, payload: unknown, context: RequestContext): Promise<unknown>;
  attach(connection: EndpointConnection): () => void;
}

// Private attachment registry; the supported package entry exposes only IEventBus.
const endpoints = new WeakMap<IEventBus, Endpoint>();
export function getEndpoint(bus: IEventBus): Endpoint {
  const endpoint = endpoints.get(bus);
  if (!endpoint) throw new BridgeError('INVALID_MESSAGE', 'The bridge requires an endpoint created by createEventBus');
  return endpoint;
}

export function createEventBus({ role, onError }: EventBusOptions): IEventBus {
  const subscribers = new Map<keyof KaotoEvents, Map<object, (payload: unknown) => void>>();
  const requestHandlers = new Map<keyof KaotoRequests, (payload: unknown, context: RequestContext) => unknown>();
  let disposed = false;
  let connection: EndpointConnection | undefined;

  const assertActive = () => {
    if (disposed) throw new BridgeError('DISPOSED', 'The endpoint has been disposed');
  };

  const report = (error: Error) => {
    try {
      onError(error);
    } catch {
      // Diagnostic callbacks must not interrupt delivery or connection cleanup.
    }
  };

  const dispatch = (event: keyof KaotoEvents, payload: unknown) => {
    const snapshot = Array.from(subscribers.get(event)?.values() ?? []);
    for (const handler of snapshot) {
      try {
        handler(payload);
      } catch (error) {
        report(
          error instanceof Error
            ? error
            : new BridgeError('INTERNAL_ERROR', typeof error === 'string' ? error : 'An event subscriber failed'),
        );
      }
    }
  };

  const bus: IEventBus = {
    emit(event, payload) {
      assertActive();
      if (!isEventName(event) || eventCatalog[event].sender !== role || !eventCatalog[event].isPayload(payload)) {
        throw new BridgeError('INVALID_MESSAGE', `Invalid event: ${event}`);
      }
      connection?.emit(event, payload);
      dispatch(event, payload);
    },
    on(event, handler) {
      assertActive();
      if (!isEventName(event) || typeof handler !== 'function') {
        throw new BridgeError('INVALID_MESSAGE', `Invalid event subscription: ${event}`);
      }
      const listeners = subscribers.get(event) ?? new Map();
      const registration = {};
      listeners.set(registration, (payload: unknown) => {
        handler(payload as Parameters<typeof handler>[0]);
      });
      subscribers.set(event, listeners);
      return () => {
        listeners.delete(registration);
        if (listeners.size === 0 && subscribers.get(event) === listeners) subscribers.delete(event);
      };
    },
    async request<R extends keyof KaotoRequests>(
      request: R,
      payload: KaotoRequests[R],
      options?: RequestOptions,
    ): Promise<KaotoResponses[R]> {
      assertActive();
      if (
        !isRequestName(request) ||
        requestCatalog[request].sender !== role ||
        !requestCatalog[request].isRequest(payload)
      ) {
        throw new BridgeError('INVALID_MESSAGE', `Invalid request: ${request}`);
      }
      if (!connection) throw new BridgeError('NOT_CONNECTED', 'The endpoint has no connected peer');
      // The bridge validates the response against this request key before resolving.
      return (await connection.request(request, payload, options)) as KaotoResponses[R];
    },
    onRequest(request, handler) {
      assertActive();
      if (!isRequestName(request) || requestCatalog[request].sender === role || typeof handler !== 'function') {
        throw new BridgeError('INVALID_MESSAGE', `Invalid request registration: ${request}`);
      }
      if (requestHandlers.has(request)) {
        throw new BridgeError('INTERNAL_ERROR', `A handler is already registered for ${request}`);
      }
      const registration = (payload: unknown, context: RequestContext) =>
        handler(payload as Parameters<typeof handler>[0], context);
      requestHandlers.set(request, registration);
      return () => {
        if (requestHandlers.get(request) === registration) requestHandlers.delete(request);
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      connection?.dispose();
      for (const listeners of subscribers.values()) listeners.clear();
      subscribers.clear();
      requestHandlers.clear();
    },
  };
  endpoints.set(bus, {
    role,
    report,
    dispatch,
    async invoke(request, payload, context) {
      const handler = requestHandlers.get(request);
      if (!handler) throw new BridgeError('UNSUPPORTED_REQUEST', `No handler for ${request}`);
      return handler(payload, context);
    },
    attach(attachment) {
      assertActive();
      if (connection) throw new BridgeError('INTERNAL_ERROR', 'The endpoint already has a bridge');
      connection = attachment;
      return () => {
        if (connection === attachment) connection = undefined;
      };
    },
  });
  return bus;
}
