import { type RefObject, useCallback, useMemo, useRef } from 'react';

import { BridgeError, IEventBus, SetContentRequest } from '../../../host-bridge/contracts';
import { useSourceCodeStore } from '../../../store';

export interface SourceCodeBridgeProviderRef {
  setContent: (path: string, content: string) => Promise<void>;
  getContent: () => Promise<string>;
}

export const useEditorApi = () => {
  const sourceCodeRef = useRef<string>('');
  const initializedRef = useRef(false);
  const setCodeAndNotify = useSourceCodeStore((state) => state.setCodeAndNotify);

  /** Applies content from the host: the initial document, or a change made outside the canvas. */
  const setContent = useCallback(
    (path: string, content: string) => {
      /**
       * Content equal to the current one is ignored: applying it would regenerate the Camel resource
       * and disconnect the configuration form, if open. The host can send back content the editor
       * already has, for instance when an undo lands on the current state.
       */
      if (initializedRef.current && sourceCodeRef.current === content) return;

      const previous = sourceCodeRef.current;
      sourceCodeRef.current = content;
      try {
        setCodeAndNotify(content, path);
      } catch (error) {
        sourceCodeRef.current = previous;
        throw error;
      }

      if (!initializedRef.current) {
        useSourceCodeStore.temporal.getState().clear();
        initializedRef.current = true;
      }
    },
    [setCodeAndNotify],
  );

  /** Exposed through the provider ref, so the document binding can read and replace the editor content. */
  const editorApi: SourceCodeBridgeProviderRef = useMemo(
    () => ({
      /* Called by the document binding when the host sends `host:document:setContent`. */
      setContent: (path: string, content: string) => {
        setContent(path, content);
        return Promise.resolve();
      },

      /** Called by the document binding when the host asks for `host:document:getContent`. */
      getContent: () => Promise.resolve(sourceCodeRef.current),
    }),
    [setContent],
  );

  const output = useMemo(() => {
    return {
      editorApi,
      sourceCodeRef,
      initializedRef,
    };
  }, [editorApi]);

  return output;
};

export interface EditorDocumentState {
  initialized: boolean;
  readonly: boolean;
  historyPending?: boolean;
  error?: Error;
}

/** Delivery metadata only. The existing editor ref/store continues to own source and history. */
export function bindEditorDocument(
  bus: IEventBus,
  ref: RefObject<SourceCodeBridgeProviderRef | null>,
  onStateChange: () => void = () => {},
) {
  let state: EditorDocumentState = { initialized: false, readonly: true };
  let disposed = false;
  let announced = false;
  let applyingHostContent = false;
  let revision = 0;
  let lastContent: string | undefined;
  let queue = Promise.resolve();
  let initializationTimer: ReturnType<typeof setTimeout> | undefined;

  const updateState = (next: EditorDocumentState) => {
    state = next;
    onStateChange();
  };
  const requireApi = (initializing = false) => {
    if (disposed) throw new BridgeError('DISPOSED', 'The editor document has been disposed');
    if (state.error) throw state.error;
    if (!ref.current || (!initializing && !state.initialized)) {
      throw new BridgeError('NOT_READY', 'The editor document is not initialized');
    }
    return ref.current;
  };
  const enqueue = <T,>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> => {
    const result = queue.then(() => {
      if (signal.aborted) throw new BridgeError('CANCELLED', 'The document request was cancelled');
      return operation();
    });
    queue = result.then(
      () => {},
      () => {},
    );
    return result;
  };
  const failInitialization = (error: unknown) => {
    if (state.initialized || disposed) return;
    clearTimeout(initializationTimer);
    updateState({
      ...state,
      error: error instanceof Error ? error : new BridgeError('INTERNAL_ERROR', 'Could not initialize the document'),
    });
  };
  const setContent = async (request: SetContentRequest, signal: AbortSignal) => {
    const api = requireApi(request.reason === 'init');
    if (request.reason === 'init' && state.initialized) return { applied: false, revision };
    // The host answered; a large document may take longer to apply than the startup deadline.
    if (request.reason === 'init') clearTimeout(initializationTimer);
    if (state.initialized && (await api.getContent()) === request.content) return { applied: false, revision };
    requireApi(request.reason === 'init');
    if (signal.aborted) throw new BridgeError('CANCELLED', 'The document request was cancelled');
    applyingHostContent = true;
    try {
      await api.setContent(request.fileUri, request.content);
      requireApi(request.reason === 'init');
      lastContent = request.content;
      if (request.reason === 'init') {
        clearTimeout(initializationTimer);
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
  const unsubscribers = [
    bus.onRequest('host:document:setContent', (request, { signal }) =>
      enqueue(() => setContent(request, signal), signal),
    ),
    bus.onRequest('host:document:getContent', (_request, { signal }) =>
      enqueue(async () => {
        const content = requireApi().getContent();
        const snapshotRevision = revision;
        return { content: await content, revision: snapshotRevision };
      }, signal),
    ),
  ];

  return {
    getState: () => state,
    async applyHistory(command: 'undo' | 'redo') {
      requireApi();
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
      requireApi(true);
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
    notifyChange(content: string) {
      if (
        disposed ||
        !state.initialized ||
        state.readonly ||
        state.error ||
        applyingHostContent ||
        content === lastContent
      )
        return;
      lastContent = content;
      revision++;
      bus.emit('editor:document:changed', { content, revision });
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
