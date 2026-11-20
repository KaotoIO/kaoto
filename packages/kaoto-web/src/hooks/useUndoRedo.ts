import { useContext } from 'react';

import { EditorHistoryContext } from '../context/EditorHistoryContextDefinition';

export interface UndoRedoState {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const NO_HISTORY: UndoRedoState = { undo: () => {}, redo: () => {}, canUndo: false, canRedo: false };

/** The undo/redo history of the open editor, or a disabled one when the editor has none */
export function useUndoRedo(): UndoRedoState {
  return useContext(EditorHistoryContext)?.history ?? NO_HISTORY;
}
