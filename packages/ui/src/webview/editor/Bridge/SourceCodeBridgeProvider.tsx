import { forwardRef, PropsWithChildren, useEffect, useImperativeHandle, useRef } from 'react';

import { type UndoRedoActions, UndoRedoContext } from '../../../hooks/undo-redo.hook';
import { useSourceCodeStore } from '../../../store';
import { EventNotifier } from '../../../utils';
import { SourceCodeBridgeProviderRef, useEditorApi } from './editor-api';

interface SourceCodeBridgeProviderProps extends PropsWithChildren {
  /**
   * Reports a change made in the editor, so the host can apply it to the document.
   * @param edit The new content of the document.
   */
  onNewEdit: (edit: string) => Promise<void>;
  /** Undo and redo are delegated to the host, which owns the document history. */
  history: UndoRedoActions;
}

export const SourceCodeBridgeProvider = forwardRef<SourceCodeBridgeProviderRef, SourceCodeBridgeProviderProps>(
  ({ onNewEdit, history, children }, ref) => {
    const eventNotifier = EventNotifier.getInstance();
    const { editorApi, sourceCodeRef, initializedRef } = useEditorApi();
    const receivedContent = useRef(false);

    // The local history store would only duplicate the host history
    useEffect(() => {
      const temporal = useSourceCodeStore.temporal.getState();
      const wasTracking = temporal.isTracking;
      temporal.pause();
      temporal.clear();
      return () => {
        if (wasTracking) temporal.resume();
      };
    }, []);

    /**
     * Subscribe to the `entities:updated` event to update the File content.
     */
    useEffect(() => {
      const updateContent = (newContent: string, fromEntities: boolean) => {
        const changed = sourceCodeRef.current !== newContent;
        const publish = fromEntities || initializedRef.current || receivedContent.current;
        receivedContent.current = true;
        sourceCodeRef.current = newContent;
        if (changed && publish) {
          onNewEdit(newContent).catch((error) => {
            console.error('Failed to apply edit:', error);
          });
        }
      };
      const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', (newContent: string) => {
        updateContent(newContent, true);
      });

      const unsubscribeFromSourceCode = eventNotifier.subscribe('code:updated', ({ code: newContent }) => {
        updateContent(newContent, false);
      });

      return () => {
        unsubscribeFromEntities();
        unsubscribeFromSourceCode();
      };
    }, [eventNotifier, initializedRef, onNewEdit, sourceCodeRef]);

    /**
     * The useImperativeHandler gives the control of the Editor component to who has it's reference,
     * making it possible to communicate with the Editor.
     * It returns all methods that are determined on the EditorApi.
     */
    useImperativeHandle(ref, () => editorApi);

    return <UndoRedoContext.Provider value={history}>{children}</UndoRedoContext.Provider>;
  },
);
