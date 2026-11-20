import { FunctionComponent, PropsWithChildren, useLayoutEffect, useRef } from 'react';

import { type UndoRedoActions, UndoRedoContext } from '../hooks/undo-redo.hook';
import { LocalStorageKeys } from '../models';
import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

export interface SourceDocument {
  code: string;
  path?: string;
}

/**
 * Where the source code comes from and where editor changes go to.
 *
 * - `subscribe` delivers the initial document through `apply` (synchronously or later) and may keep
 *   delivering replacements, for example when the host reloads the file or applies native undo.
 * - `onChange` receives every change made in the editor, from the canvas, the forms or the code tab.
 */
export interface SourceCodeAdapter {
  subscribe(apply: (document: SourceDocument) => void): () => void;
  onChange?(code: string): void;
}

interface SourceCodeProviderProps extends PropsWithChildren {
  /** Read on mount; create it once (module constant or `useMemo`). */
  adapter: SourceCodeAdapter;
  /** Set when the host owns the document history; the local undo/redo store is paused meanwhile. */
  history?: UndoRedoActions;
}

/**
 * Single owner of the source code store. It must be an ancestor of the KaotoResourceProvider,
 * which parses the `code:updated` events this provider emits.
 */
export const SourceCodeProvider: FunctionComponent<SourceCodeProviderProps> = ({ adapter, history, children }) => {
  const applyingRef = useRef(false);
  const hostHistory = history !== undefined;

  useLayoutEffect(() => {
    if (!hostHistory) return;
    const temporal = useSourceCodeStore.temporal.getState();
    const wasTracking = temporal.isTracking;
    temporal.pause();
    temporal.clear();
    return () => {
      if (wasTracking) temporal.resume();
    };
  }, [hostHistory]);

  useLayoutEffect(() => {
    const eventNotifier = EventNotifier.getInstance();
    let seeded = false;
    /** The path of the last applied document; the store's path can be dropped by the editors */
    let appliedPath: string | undefined;

    const apply = ({ code, path }: SourceDocument) => {
      applyingRef.current = true;
      try {
        useSourceCodeStore.getState().setCodeAndNotify(code, path);
      } finally {
        applyingRef.current = false;
      }
      // The first document and a document of another file start a new history, so undo does not go back into
      // the previous file; a document of the same file (e.g. a reload) keeps it.
      if (!seeded || path !== appliedPath) {
        seeded = true;
        useSourceCodeStore.temporal.getState().clear();
      }
      appliedPath = path;
    };

    const unsubscribeFromAdapter = adapter.subscribe(apply);
    const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', (code) => {
      useSourceCodeStore.getState().setSourceCode(code);
    });
    // Single outgoing path: any change of the stored code that the adapter did not apply goes out, whoever wrote it
    // (the canvas through `entities:updated`, the code tab, or the local undo/redo). Identical code is not a change.
    const unsubscribeFromStore = useSourceCodeStore.subscribe((state, previous) => {
      if (!applyingRef.current && state.sourceCode !== previous.sourceCode) adapter.onChange?.(state.sourceCode);
    });

    return () => {
      unsubscribeFromAdapter();
      unsubscribeFromEntities();
      unsubscribeFromStore();
    };
    // The adapter is read once on mount; swapping it would re-seed the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <UndoRedoContext.Provider value={history}>{children}</UndoRedoContext.Provider>;
};

/** Seeds the editor with a fixed document; used by stories and tests. */
export const inMemorySourceCodeAdapter = (code = '', path?: string): SourceCodeAdapter => ({
  subscribe(apply) {
    apply({ code, path });
    return () => {};
  },
});

/** The standalone web application keeps the document in the browser's localStorage. */
export const localStorageSourceCodeAdapter: SourceCodeAdapter = {
  subscribe(apply) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LocalStorageKeys.SourceCode);
    } catch (error) {
      console.error('Could not read the source code from localStorage', error);
    }
    apply({ code: stored ?? '[]' });
    return () => {};
  },
  onChange(code) {
    try {
      localStorage.setItem(LocalStorageKeys.SourceCode, code);
    } catch (error) {
      console.error('Could not persist the source code to localStorage', error);
    }
  },
};
