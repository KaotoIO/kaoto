import { ChannelType, EditorApi, StateControlCommand } from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import { VisualizationProvider } from '@patternfly/react-topology';
import {
  PropsWithChildren,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { NodeInteractionAddonProvider } from '../components/registers/interactions/node-interaction-addon.provider';
import { RegisterComponents } from '../components/registers/RegisterComponents';
import { RegisterNodeInteractionAddons } from '../components/registers/RegisterNodeInteractionAddons';
import { RenderingProvider } from '../components/RenderingAnchor/rendering.provider';
import { ControllerService } from '../components/Visualization/Canvas/controller.service';
import { useReload } from '../hooks/reload.hook';
import {
  CatalogLoaderProvider,
  CatalogTilesProvider,
  MetadataProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SettingsContext,
  SourceCodeApiContext,
  VisibleFlowsProvider,
} from '../providers';
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
  onNewEdit: (edit: string) => Promise<void>;

  /**
   * Delegation for NotificationsChannelApi.kogigotNotifications_setNotifications(path, notifications) to report all validation
   * notifications to the Channel that will replace existing notification for the path.
   * @param path The path that references the Notification
   * @param notifications List of Notifications
   */
  setNotifications: (path: string, notifications: Notification[]) => void;

  /**
   * Get metadata querying a Kaoto metadata file using the channel API.
   * @param key The key to retrieve the metadata from the Kaoto metadata file
   */
  getMetadata<T>(key: string): Promise<T | undefined>;

  /**
   * Save metadata to a Kaoto metadata file using the channel API.
   * @param key The key to set the metadata
   * @param metadata The metadata to be saved
   */
  setMetadata<T>(key: string, metadata: T): Promise<void>;

  /**
   * Retrieve resource content using the channel API.
   * @param path The path of the resource
   */
  getResourceContent(path: string): Promise<string | undefined>;

  /**
   * Save resource content using the channel API.
   * @param path The path of the resource
   * @param content The content to be saved
   */
  saveResourceContent(path: string, content: string): Promise<void>;

  /**
   * Delete resource using the channel API.
   * @param path The path of the resource
   */
  deleteResource(path: string): Promise<boolean>;

  /**
   * Show a Quick Pick widget and ask the user to select one or more files available in the workspace.
   * @param include The filter expression for the files to include
   * @param exclude The filter expression for the files to exclude
   * @param options The options to pass over to VSCode QuickPick
   */
  askUserForFileSelection(
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined>;

  /**
   * ChannelType where the component is running.
   */
  channelType: ChannelType;
}

export const KaotoBridge = forwardRef<EditorApi, PropsWithChildren<KaotoBridgeProps>>(
  (
    {
      onNewEdit,
      onReady,
      children,
      getMetadata,
      setMetadata,
      getResourceContent,
      saveResourceContent,
      deleteResource,
      askUserForFileSelection,
    },
    forwardedRef,
  ) => {
    const ReloadProvider = useReload();
    const controller = useMemo(() => ControllerService.createController(), []);
    const eventNotifier = EventNotifier.getInstance();
    const sourceCodeApiContext = useContext(SourceCodeApiContext);
    const sourceCodeRef = useRef<string>('');
    const settingsAdapter = useContext(SettingsContext);
    const catalogUrl = settingsAdapter.getSettings().catalogUrl;
    const metadataApi = useMemo(
      () => ({
        getMetadata,
        setMetadata,
        getResourceContent,
        saveResourceContent,
        deleteResource,
        askUserForFileSelection,
      }),
      [getMetadata, setMetadata, getResourceContent, saveResourceContent, deleteResource, askUserForFileSelection],
    );

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
      const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', (newContent: string) => {
        onNewEdit(newContent);
        sourceCodeRef.current = newContent;
      });

      const unsubscribeFromSourceCode = eventNotifier.subscribe('code:updated', (newContent: string) => {
        /** Ignore the first change, from an empty string to the file content  */
        if (sourceCodeRef.current !== '') {
          onNewEdit(newContent);
        }
        sourceCodeRef.current = newContent;
      });

      return () => {
        unsubscribeFromEntities();
        unsubscribeFromSourceCode();
      };
    }, [eventNotifier, onNewEdit]);

    /**
     * The useImperativeHandler gives the control of the Editor component to who has it's reference,
     * making it possible to communicate with the Editor.
     * It returns all methods that are determined on the EditorApi.
     */
    useImperativeHandle(forwardedRef, () => {
      return {
        /* Callback is exposed to the Channel to set the content of the file into the current Editor. */
        setContent: (path: string, content: string) => Promise.resolve(setContent(path, content)),
        /**
         * Callback is exposed to the Channel to retrieve the current value of the Editor. It returns the value of
         * the editorContent, which is the state that has the kaoto yaml.
         */
        getContent: () => Promise.resolve(sourceCodeRef.current),
        getPreview: () => Promise.resolve(undefined),
        undo: (): Promise<void> => {
          return Promise.resolve();
        },
        redo: (): Promise<void> => {
          return Promise.resolve();
        },
        validate: () => Promise.resolve([]),
        setTheme: () => Promise.resolve(),
      };
    });

    /** Set editor as Ready */
    useEffect(onReady, [onReady]);

    return (
      <ReloadProvider>
        <RuntimeProvider catalogUrl={catalogUrl}>
          <SchemasLoaderProvider>
            <CatalogLoaderProvider>
              <CatalogTilesProvider>
                <VisualizationProvider controller={controller}>
                  <VisibleFlowsProvider>
                    <RenderingProvider>
                      <MetadataProvider api={metadataApi}>
                        <RegisterComponents>
                          <NodeInteractionAddonProvider>
                            <RegisterNodeInteractionAddons>{children}</RegisterNodeInteractionAddons>
                          </NodeInteractionAddonProvider>
                        </RegisterComponents>
                      </MetadataProvider>
                    </RenderingProvider>
                  </VisibleFlowsProvider>
                </VisualizationProvider>
              </CatalogTilesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </RuntimeProvider>
      </ReloadProvider>
    );
  },
);
