export interface UndoRedoState {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo(): UndoRedoState {
  return { undo: () => {}, redo: () => {}, canUndo: false, canRedo: false };
}
