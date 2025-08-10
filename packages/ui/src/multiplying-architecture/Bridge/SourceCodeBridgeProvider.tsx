import { forwardRef, PropsWithChildren, useEffect, useImperativeHandle } from 'react';
import { StateControlCommand } from '@kie-tools-core/editor/dist/api';
import { EventNotifier } from '../../utils';
import { SourceCodeBridgeProviderRef, useEditorApi } from './editor-api';
import { EditService } from '../EditService';
import { EditorCommandsContext } from './EditorCommandsContext';

interface SourceCodeBridgeProviderProps extends PropsWithChildren {
  /**
   * Delegation for WorkspaceChannelApi.kogitoWorkspace_newEdit(edit) to signal to the Channel
   * that a change has taken place.
   * @param edit An object representing the unique change.
   */
  onNewEdit: (edit: string) => Promise<void>;
  /**
   * Delegation for KogitoEditorChannelApi.kogitoEditor_stateControlCommandUpdate(command)
   */
  onStateControlCommandUpdate?: (command: StateControlCommand) => void;
}

export const SourceCodeBridgeProvider = forwardRef<SourceCodeBridgeProviderRef, SourceCodeBridgeProviderProps>(
  ({ onNewEdit, onStateControlCommandUpdate, children }, ref) => {
    const eventNotifier = EventNotifier.getInstance();
    const { editorApi, sourceCodeRef } = useEditorApi(onStateControlCommandUpdate);

    /**
     * Subscribe to the `entities:updated` event to update the File content.
     */
    useEffect(() => {
      const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', (newContent: string) => {
        onNewEdit(newContent);
        sourceCodeRef.current = newContent;
      });

      const unsubscribeFromSourceCode = eventNotifier.subscribe('code:updated', ({ code: newContent }) => {
        /** Ignore the first change, from an empty string to the file content  */
        if (sourceCodeRef.current !== '') {
          // don't register a new edit if we're applying an undo/redo or the content didn't change
          if (!EditService.getInstance().isPerformingUndoRedo() && sourceCodeRef.current !== newContent) {
            onNewEdit(newContent);
          }
        }
        sourceCodeRef.current = newContent;
      });

      return () => {
        unsubscribeFromEntities();
        unsubscribeFromSourceCode();
      };
    }, [eventNotifier, onNewEdit, sourceCodeRef]);

    /**
     * The useImperativeHandler gives the control of the Editor component to who has it's reference,
     * making it possible to communicate with the Editor.
     * It returns all methods that are determined on the EditorApi.
     */
    useImperativeHandle(ref, () => editorApi);

    return (
      <EditorCommandsContext.Provider
        value={{
          undo: editorApi.undo,
          redo: editorApi.redo,
          canUndo: () => EditService.getInstance().canUndo(),
          canRedo: () => EditService.getInstance().canRedo(),
        }}
      >
        {children}
      </EditorCommandsContext.Provider>
    );
  },
);
