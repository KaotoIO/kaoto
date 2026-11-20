import { RouteVisualizationUndoRedo } from '@kaoto/kaoto/components';
import { createContext } from 'react';

export interface IEditorHistoryContext {
  /** The undo/redo history of the open editor, if it has one */
  history?: RouteVisualizationUndoRedo;
  setHistory: (history: RouteVisualizationUndoRedo | undefined) => void;
}

export const EditorHistoryContext = createContext<IEditorHistoryContext | undefined>(undefined);
