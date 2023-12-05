import { ChannelType, EditorApi, StateControlCommand } from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import { WorkspaceEdit } from '@kie-tools-core/workspace/dist/api';
import { PropsWithChildren, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { CatalogModalProvider } from '../providers/catalog-modal.provider';
import { CatalogTilesProvider } from '../providers/catalog-tiles.provider';
import { CatalogLoaderProvider } from '../providers/catalog.provider';
import { SchemasLoaderProvider } from '../providers/schemas.provider';
import { SourceCodeApiContext, SourceCodeContext } from '../providers/source-code.provider';
import { EventNotifier } from '../utils';

interface KaotoBridgeProps {
  /**
   * Delegation for KogitoEditorChannelApi.kogitoEditor_ready() to signal to the Channel
   * that the editor is ready.
   */
  onReady: () => void;

  /**
   * Delegation for KogitoEditorChannelApi.kogitoEditor_stateControlCommandUpdate(command) to signal to the Channel
   * that the editor is performing an undo/redo operation.
   */
  onStateControlCommandUpdate: (command: StateControlCommand) => void;

  /**
   * Delegation for WorkspaceChannelApi.kogitoWorkspace_newEdit(edit) to signal to the Channel
   * that a change has taken place.
   * @param edit An object representing the unique change.
   */
  onNewEdit: (edit: WorkspaceEdit) => void;

  /**
   * Delegation for NotificationsChannelApi.kogigotNotifications_setNotifications(path, notifications) to report all validation
   * notifications to the Channel that will replace existing notification for the path.
   * @param path The path that references the Notification
   * @param notifications List of Notifications
   */
  setNotifications: (path: string, notifications: Notification[]) => void;

  /**
   * ChannelType where the component is running.
   */
  channelType: ChannelType;

  /**
   * Catalog URL to load the components and schemas.
   */
  catalogUrl: string;
}

export const KaotoBridge = forwardRef<EditorApi, PropsWithChildren<KaotoBridgeProps>>((props, forwardedRef) => {
  const eventNotifier = EventNotifier.getInstance();
  const sourceCodeContext = useContext(SourceCodeContext);
  const sourceCodeApiContext = useContext(SourceCodeApiContext);
  const sourceCodeRef = useRef<string>(sourceCodeContext ?? '');

  /**
   * Callback is exposed to the Channel that is called when a new file is opened.
   * It sets the originalContent to the received value.
   */
  const setContent = useCallback(
    (_path: string, content: string) => {
      /**
       * If the new content is the same as the current one, we don't need to update the Editor,
       * as it will regenerate the Camel Resource, hence disconnecting the configuration form (if open).
       *
       * This happens due to the multiplying architecture lifecycle, where the content is set
       * after saving the file.
       *
       * The lifecycle is:
       * 1. User edits the file either adding a new node or modifying an existing one using the form
       * 2. User saves the file
       * 3. The Envelope uses the `getContent` callback to retrieve the new content
       * 4. The Envelope sets the new content using the `setContent` callback
       *
       * At this point, both the new content and the current content are the same, so the Editor
       * don't need to be updated.
       */
      if (sourceCodeRef.current === content) return;

      sourceCodeApiContext.setCodeAndNotify(content);
      sourceCodeRef.current = content;
    },
    [sourceCodeApiContext],
  );

  /**
   * Subscribe to the `entities:updated` event to update the File content.
   */
  useEffect(() => {
    return eventNotifier.subscribe('entities:updated', (newContent: string) => {
      props.onNewEdit(new WorkspaceEdit(newContent));
      sourceCodeRef.current = newContent;
    });
  }, [eventNotifier, props]);

  /**
   * The useImperativeHandler gives the control of the Editor component to who has it's reference,
   * making it possible to communicate with the Editor.
   * It returns all methods that are determined on the EditorApi.
   */
  useImperativeHandle(forwardedRef, () => {
    return {
      /**
       * Callback is exposed to the Channel to retrieve the current value of the Editor. It returns the value of
       * the editorContent, which is the state that has the kaoto yaml.
       */
      getContent: () => Promise.resolve(sourceCodeRef.current),
      /* Callback is exposed to the Channel to set the content of the file into the current Editor. */
      setContent: (path: string, content: string) => Promise.resolve(setContent(path, content)),
      getPreview: () => Promise.resolve(undefined),
      undo: (): Promise<void> => {
        return Promise.resolve();
      },
      redo: (): Promise<void> => {
        return Promise.resolve();
      },
      getElementPosition: () => Promise.resolve(undefined),
      validate: () => Promise.resolve([]),
      setTheme: () => Promise.resolve(),
    };
  });

  /** Set editor as Ready */
  useEffect(() => {
    props.onReady();
  }, [props]);

  return (
    <SchemasLoaderProvider catalogUrl={props.catalogUrl}>
      <CatalogLoaderProvider catalogUrl={props.catalogUrl}>
        <CatalogTilesProvider>
          <CatalogModalProvider>{props.children}</CatalogModalProvider>
        </CatalogTilesProvider>
      </CatalogLoaderProvider>
    </SchemasLoaderProvider>
  );
});
