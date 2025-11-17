import { useCallback } from 'react';
import { useStore } from 'zustand';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

export const useUndoRedo = () => {
  const eventNotifier = EventNotifier.getInstance();
  const {
    undo: storeUndo,
    redo: storeRedo,
    pastStates,
    futureStates,
  } = useStore(useSourceCodeStore.temporal, ({ undo, redo, pastStates, futureStates }) => ({
    undo,
    redo,
    pastStates,
    futureStates,
  }));

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const clear = useSourceCodeStore.temporal.getState().clear;

  const undo = useCallback(() => {
    storeUndo();
    eventNotifier.next('code:updated', {
      code: useSourceCodeStore.getState().sourceCode,
      path: useSourceCodeStore.getState().path,
    });
  }, [storeUndo, eventNotifier]);

  const redo = useCallback(() => {
    storeRedo();
    eventNotifier.next('code:updated', {
      code: useSourceCodeStore.getState().sourceCode,
      path: useSourceCodeStore.getState().path,
    });
  }, [storeRedo, eventNotifier]);

  return { undo, redo, clear, canUndo, canRedo };
};
