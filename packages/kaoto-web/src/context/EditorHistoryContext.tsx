import { RouteVisualizationUndoRedo } from '@kaoto/kaoto/components';
import { FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

import { EditorHistoryContext } from './EditorHistoryContextDefinition';

/** Lets the editor in the page hand its history to the Undo and Redo buttons of the toolbar above it */
export const EditorHistoryProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [history, setHistory] = useState<RouteVisualizationUndoRedo>();
  const value = useMemo(() => ({ history, setHistory }), [history]);

  return <EditorHistoryContext.Provider value={value}>{children}</EditorHistoryContext.Provider>;
};
