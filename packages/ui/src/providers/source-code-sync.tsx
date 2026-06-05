import { FunctionComponent, PropsWithChildren, useLayoutEffect } from 'react';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

interface SourceCodeSyncProps extends PropsWithChildren {
  /** The initial source code */
  initialSourceCode?: string;
}

/**
 * Lifecycle-only component (no context). It owns two jobs that must run at a tree
 * position that is an ancestor of the KaotoResourceProvider:
 *  1. Seed the initial source code into the store on mount (which emits `code:updated`).
 *  2. Keep the store's source code in sync with entity edits (`entities:updated`).
 * It never subscribes reactively to the store, so it never re-renders on code changes.
 */
export const SourceCodeSync: FunctionComponent<SourceCodeSyncProps> = ({ initialSourceCode = '', children }) => {
  const eventNotifier = EventNotifier.getInstance();

  useLayoutEffect(() => {
    useSourceCodeStore.getState().setCodeAndNotify(initialSourceCode);
    useSourceCodeStore.temporal.getState().clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code) => {
      useSourceCodeStore.getState().setSourceCode(code);
    });
  }, [eventNotifier]);

  return <>{children}</>;
};
