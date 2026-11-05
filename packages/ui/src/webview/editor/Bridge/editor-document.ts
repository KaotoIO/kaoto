import { BridgeError, IEventBus, SetContentRequest } from '../../../host-bridge/contracts';
import type { SourceCodeAdapter, SourceDocument } from '../../../providers/source-code.provider';
import { useSourceCodeStore } from '../../../store';

/** Matches the start of the query or the fragment of a URI. */
const URI_QUERY_OR_FRAGMENT = /[?#]/;

/**
 * Returns the file name of a document URI, without the query, the fragment or the parent folders.
 * The resource type is detected from the path with substring matches, so folder names such as
 * `data.pipeline` or `com.acme.integration`, or a `git:` URI query, must not take part in it.
 */
export const getFileNameFromUri = (uri: string): string => {
  const end = uri.search(URI_QUERY_OR_FRAGMENT);
  const withoutQuery = end === -1 ? uri : uri.slice(0, end);
  return withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1);
};

export interface EditorDocumentState {
  initialized: boolean;
  readonly: boolean;
  historyPending?: boolean;
  error?: Error;
}

/**
 * Binds the host document protocol to the source code store.
 *
 * The returned `adapter` plugs into the SourceCodeProvider: host content flows in through `subscribe`,
 * editor changes flow out through `onChange`. Everything else is delivery metadata (revision, readiness, history).
 */
export function bindEditorDocument(bus: IEventBus) {
  let state: EditorDocumentState = { initialized: false, readonly: true };
  let disposed = false;
  let announced = false;
  let applyingHostContent = false;
  let revision = 0;
  let apply: ((document: SourceDocument) => void) | undefined;
  let initializationTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const updateState = (next: EditorDocumentState) => {
    state = next;
    listeners.forEach((listener) => {
      listener();
    });
  };
  const requireReady = (initializing = false) => {
    if (disposed) throw new BridgeError('DISPOSED', 'The editor document has been disposed');
    if (state.error) throw state.error;
    if (!apply || (!initializing && !state.initialized)) {
      throw new BridgeError('NOT_READY', 'The editor document is not initialized');
    }
    return apply;
  };
  const failInitialization = (error: unknown) => {
    if (state.initialized || disposed) return;
    clearTimeout(initializationTimer);
    updateState({
      ...state,
      error: error instanceof Error ? error : new BridgeError('INTERNAL_ERROR', 'Could not initialize the document'),
    });
  };
  const setContent = (request: SetContentRequest, signal: AbortSignal) => {
    const applyContent = requireReady(request.reason === 'init');
    if (request.reason === 'init' && state.initialized) return { applied: false, revision };
    // The host answered; a large document may take longer to apply than the startup deadline.
    if (request.reason === 'init') clearTimeout(initializationTimer);
    // Identical content would only regenerate the Camel resource and disconnect any open form.
    if (state.initialized && useSourceCodeStore.getState().sourceCode === request.content) {
      return { applied: false, revision };
    }
    if (signal.aborted) throw new BridgeError('CANCELLED', 'The document request was cancelled');
    applyingHostContent = true;
    try {
      const path = getFileNameFromUri(request.fileUri);
      // A document that does not parse keeps the last valid resource, so give it an empty one to fall back to.
      // React batches both updates: a valid document never renders the empty resource.
      if (request.reason === 'init') applyContent({ code: '', path });
      applyContent({ code: request.content, path });
      if (request.reason === 'init') {
        updateState({ initialized: true, readonly: request.readonly });
      } else {
        revision++;
      }
      return { applied: true, revision };
    } catch (error) {
      failInitialization(error);
      throw error;
    } finally {
      applyingHostContent = false;
    }
  };
  const notifyChange = (content: string) => {
    if (disposed || !state.initialized || state.readonly || state.error || applyingHostContent) return;
    revision++;
    bus.emit('editor:document:changed', { content, revision });
  };
  const unsubscribers = [
    bus.onRequest('host:document:setContent', (request, { signal }) => setContent(request, signal)),
    bus.onRequest('host:document:getContent', () => {
      requireReady();
      return { content: useSourceCodeStore.getState().sourceCode, revision };
    }),
  ];

  const adapter: SourceCodeAdapter = {
    subscribe(next) {
      apply = next;
      // A provider mounted after initialization (for instance a reload) continues with the current document.
      if (state.initialized) {
        const { sourceCode, path } = useSourceCodeStore.getState();
        next({ code: sourceCode, path: path || undefined });
      }
      return () => {
        if (apply === next) apply = undefined;
      };
    },
    onChange: notifyChange,
  };

  return {
    adapter,
    getState: () => state,
    /** `useSyncExternalStore` subscription */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async applyHistory(command: 'undo' | 'redo') {
      requireReady();
      if (state.readonly || state.historyPending) {
        throw new BridgeError('NOT_READY', 'Host history is not available');
      }
      updateState({ ...state, historyPending: true });
      try {
        await bus.request('editor:undoRedo:apply', { command, revision });
      } finally {
        updateState({ ...state, historyPending: false });
      }
    },
    ready() {
      requireReady(true);
      if (announced) return;
      announced = true;
      if (!state.initialized) {
        initializationTimer = setTimeout(() => {
          updateState({
            ...state,
            error: new BridgeError('TIMEOUT', 'The host did not initialize the document. Please retry.'),
          });
        }, 5_000);
      }
      bus.emit('editor:ready', null);
    },
    suspend(error: Error) {
      clearTimeout(initializationTimer);
      updateState({ ...state, error });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(initializationTimer);
      unsubscribers.forEach((unsubscribe) => {
        unsubscribe();
      });
      updateState({ ...state, error: new BridgeError('DISPOSED', 'The editor document has been disposed') });
    },
  };
}
