import { createContext, useContext } from 'react';

export interface EditorCommandsApi {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo?: () => boolean;
  canRedo?: () => boolean;
  version?: number;
}

const noop = async () => {};

export const EditorCommandsContext = createContext<EditorCommandsApi>({
  undo: noop,
  redo: noop,
});

export const useEditorCommands = () => useContext(EditorCommandsContext);
