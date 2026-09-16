import { type RefObject, useCallback, useMemo, useRef } from 'react';

import { useUndoRedo } from '../../hooks/undo-redo.hook';
import {
  BridgeError,
  type IEventBus,
  type KaotoEvents,
  type SetContentRequest,
  type ValidationNotification,
} from '../../host-bridge';
import { useSourceCodeStore } from '../../store';

export interface SourceCodeBridgeProviderRef {
  setContent: (path: string, content: string) => Promise<void>;
  getContent: () => Promise<string>;
  getPreview: () => Promise<string | undefined>;
  validate: () => Promise<ValidationNotification[]>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  setTheme: (theme: KaotoEvents['host:theme:changed']['theme']) => Promise<void>;
}

export const useEditorApi = () => {
  const sourceCodeRef = useRef<string>('');
  const initializedRef = useRef(false);
  const setCodeAndNotify = useSourceCodeStore((state) => state.setCodeAndNotify);
  const { undo, redo } = useUndoRedo();

  /**
   * Callback is exposed to the Channel that is called when a new file is opened.
   * It sets the originalContent to the received value.
   */
  const setContent = useCallback(
    (path: string, content: string) => {
      /**
       * If the new content is the same as the current one, we don't need to update the Editor,
       * as it will regenerate the Camel Resource, hence disconnecting the configuration form (if open).
       *
       * This happens due to the multiplying architecture lifecycle, where the content is set
       * after saving the file.
       *
       * The lifecycle is:
       * 1. User edits the file either adding a new node or modifying an existing one using the form
       * 2. User saves the file
       * 3. The Envelope uses the `getContent` callback to retrieve the new content
       * 4. The Envelope sets the new content using the `setContent` callback
       *
       * At this point, both the new content and the current content are the same, so the Editor
       * don't need to be updated.
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

  /**
   * The useImperativeHandler gives the control of the Editor component to who has it's reference,
   * making it possible to communicate with the Editor.
   * It returns all methods that are determined on the EditorApi.
   */
  const editorApi: SourceCodeBridgeProviderRef = useMemo(
    () => ({
      /* Callback is exposed to the Channel to set the content of the file into the current Editor. */
      setContent: (path: string, content: string) => {
        setContent(path, content);
        return Promise.resolve();
      },

      /**
       * Callback is exposed to the Channel to retrieve the current value of the Editor. It returns the value of
       * the editorContent, which is the state that has the kaoto yaml.
       */
      getContent: () => Promise.resolve(sourceCodeRef.current),
      getPreview: () => Promise.resolve(undefined),
      undo: (): Promise<void> => {
        undo();
        return Promise.resolve();
      },
      redo: (): Promise<void> => {
        redo();
        return Promise.resolve();
      },
      validate: () => Promise.resolve([]),
      setTheme: () => Promise.resolve(),
    }),
    [redo, setContent, undo],
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
  nativeUndoRedo?: boolean;
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
    if (request.reason === 'saveEcho') {
      if (request.revision > revision)
        throw new BridgeError('INVALID_MESSAGE', 'Save echo refers to a future revision');
      return { applied: false, revision };
    }
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
        updateState({ initialized: true, readonly: request.readonly, nativeUndoRedo: request.nativeUndoRedo });
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
    bus.onRequest('editor:document:setContent', (request, { signal }) =>
      enqueue(() => setContent(request, signal), signal),
    ),
    bus.onRequest('editor:document:getContent', (_request, { signal }) =>
      enqueue(async () => {
        const content = requireApi().getContent();
        const snapshotRevision = revision;
        return { content: await content, revision: snapshotRevision };
      }, signal),
    ),
    bus.onRequest('editor:document:validate', (_request, { signal }) =>
      enqueue(async () => ({ notifications: await requireApi().validate() }), signal),
    ),
    bus.onRequest('editor:preview:get', (_request, { signal }) =>
      enqueue(async () => ({ svg: (await requireApi().getPreview()) ?? null }), signal),
    ),
    bus.onRequest('editor:undoRedo:apply', ({ command }, { signal }) =>
      enqueue(async () => {
        const api = requireApi();
        if (state.readonly) throw new BridgeError('NOT_READY', 'The editor document is read-only');
        if (state.nativeUndoRedo) throw new BridgeError('UNSUPPORTED_REQUEST', 'The host owns document history');
        await api[command]();
        return null;
      }, signal),
    ),
    bus.on('host:theme:changed', ({ theme }) => {
      void ref.current?.setTheme(theme);
    }),
  ];

  return {
    getState: () => state,
    async applyHistory(command: 'undo' | 'redo') {
      requireApi();
      if (!state.nativeUndoRedo || state.readonly || state.historyPending) {
        throw new BridgeError('NOT_READY', 'Host history is not available');
      }
      updateState({ ...state, historyPending: true });
      try {
        await bus.request('host:undoRedo:apply', { command, revision });
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
