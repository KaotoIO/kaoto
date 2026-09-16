import { useVisualizationController } from '@patternfly/react-topology';
import { createContext, useCallback, useContext } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

export interface UndoRedoActions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/** Embeddings can delegate history while standalone editors keep their local store. */
export const UndoRedoContext = createContext<UndoRedoActions | undefined>(undefined);

export const useUndoRedo = () => {
  const hostHistory = useContext(UndoRedoContext);
  const eventNotifier = EventNotifier.getInstance();
  const controller = useVisualizationController();
  const {
    undo: storeUndo,
    redo: storeRedo,
    pastStates,
    futureStates,
  } = useStore(
    useSourceCodeStore.temporal,
    useShallow(({ undo, redo, pastStates, futureStates }) => ({
      undo,
      redo,
      pastStates,
      futureStates,
    })),
  );

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;
  const clear = useSourceCodeStore.temporal.getState().clear;

  const undo = useCallback(() => {
    storeUndo();

    // Set an empty model to clear the graph, Fixes an issue rendering special child nodes incorrectly
    controller.fromModel({
      nodes: [],
      edges: [],
    });

    eventNotifier.next('code:updated', {
      code: useSourceCodeStore.getState().sourceCode,
      path: useSourceCodeStore.getState().path,
    });
  }, [storeUndo, controller, eventNotifier]);

  const redo = useCallback(() => {
    storeRedo();

    // Set an empty model to clear the graph, Fixes an issue rendering special child nodes incorrectly
    controller.fromModel({
      nodes: [],
      edges: [],
    });

    eventNotifier.next('code:updated', {
      code: useSourceCodeStore.getState().sourceCode,
      path: useSourceCodeStore.getState().path,
    });
  }, [storeRedo, controller, eventNotifier]);

  return { undo, redo, clear, canUndo, canRedo, ...hostHistory };
};
