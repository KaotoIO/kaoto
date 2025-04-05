import {
  Editor,
  EditorApi,
  EditorInitArgs,
  EditorTheme,
  KogitoEditorEnvelopeContextType,
  StateControlCommand,
} from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import { WorkspaceEdit } from '@kie-tools-core/workspace/dist/api';
import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { RefObject, createRef } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AbstractSettingsAdapter } from '../models/settings';
import { CatalogLoaderProvider } from '../providers/catalog.provider';
import { EntitiesProvider } from '../providers/entities.provider';
import { RuntimeProvider } from '../providers/runtime.provider';
import { SettingsProvider } from '../providers/settings.provider';
import { SourceCodeProvider } from '../providers/source-code.provider';
import { setColorScheme } from '../utils/color-scheme';
import { EditService } from './EditService';
import { KaotoBridge } from './KaotoBridge';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { kaotoEditorRouter } from './KaotoEditorRouter';

export class KaotoEditorApp implements Editor {
  protected editorRef: RefObject<EditorApi>;
  af_isReact = true;
  af_componentId = 'kaoto-editor';
  af_componentTitle = 'Kaoto Editor';
  private pendingPath = '';
  private pendingContent = '';

  constructor(
    protected readonly envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    protected readonly initArgs: EditorInitArgs,
    protected readonly settingsAdapter: AbstractSettingsAdapter,
  ) {
    this.editorRef = createRef<EditorApi>();
    this.sendReady = this.sendReady.bind(this);
    this.sendNewEdit = this.sendNewEdit.bind(this);
    this.sendNotifications = this.sendNotifications.bind(this);
    this.sendStateControlCommand = this.sendStateControlCommand.bind(this);
    this.getMetadata = this.getMetadata.bind(this);
    this.setMetadata = this.setMetadata.bind(this);
    this.getResourceContent = this.getResourceContent.bind(this);
    this.saveResourceContent = this.saveResourceContent.bind(this);
    this.deleteResource = this.deleteResource.bind(this);
    this.askUserForFileSelection = this.askUserForFileSelection.bind(this);
  }

  async setContent(path: string, content: string): Promise<void> {
    const isStaleEdit = await EditService.getInstance().isStaleEdit(content);

    if (isStaleEdit) {
      return;
    }

    EditService.getInstance().clearEdits();

    if (this.editorRef.current !== null) {
      /** If the editor is available, we can send the content from the file */
      return this.editorRef.current.setContent(path, content);
    }

    /** Otherwise we store the parameters for when the editor is available */
    this.pendingPath = path;
    this.pendingContent = content;
  }

  async getContent(): Promise<string> {
    const content = await this.editorRef.current?.getContent();

    return content ?? '';
  }

  async getPreview(): Promise<string | undefined> {
    return this.editorRef.current?.getPreview();
  }

  async undo(): Promise<void> {
    return this.editorRef.current?.undo();
  }

  async redo(): Promise<void> {
    return this.editorRef.current?.redo();
  }

  async validate(): Promise<Notification[]> {
    return this.editorRef.current?.validate() ?? [];
  }

  async setTheme(theme: EditorTheme): Promise<void> {
    return this.editorRef.current?.setTheme(theme);
  }

  async sendReady(): Promise<void> {
    this.envelopeContext.channelApi.notifications.kogitoEditor_ready.send();

    await this.setContent(this.pendingPath, this.pendingContent);
  }

  async sendNewEdit(content: string): Promise<void> {
    await EditService.getInstance().registerEdit(content);

    const edit = new WorkspaceEdit(content);
    this.envelopeContext.channelApi.notifications.kogitoWorkspace_newEdit.send(edit);
  }

  sendNotifications(path: string, notifications: Notification[]): void {
    this.envelopeContext.channelApi.notifications.kogitoNotifications_setNotifications.send(path, notifications);
  }

  sendStateControlCommand(command: StateControlCommand): void {
    this.envelopeContext.channelApi.notifications.kogitoEditor_stateControlCommandUpdate.send(command);
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    return this.envelopeContext.channelApi.requests.getMetadata(key);
  }

  async setMetadata<T>(key: string, preferences: T): Promise<void> {
    return this.envelopeContext.channelApi.requests.setMetadata(key, preferences);
  }

  async getResourceContent(path: string): Promise<string | undefined> {
    return this.envelopeContext.channelApi.requests.getResourceContent(path);
  }

  async saveResourceContent(path: string, content: string): Promise<void> {
    return this.envelopeContext.channelApi.requests.saveResourceContent(path, content);
  }

  async deleteResource(path: string): Promise<boolean> {
    return this.envelopeContext.channelApi.requests.deleteResource(path);
  }

  async askUserForFileSelection(
    include: string,
    exclude?: string,
    options?: Record<string, unknown>,
  ): Promise<string[] | string | undefined> {
    return this.envelopeContext.channelApi.requests.askUserForFileSelection(include, exclude, options);
  }

  af_onOpen(): void {
    setColorScheme(this.settingsAdapter.getSettings().colorScheme);
  }

  af_componentRoot() {
    return (
      <RuntimeProvider catalogUrl={this.settingsAdapter.getSettings().catalogUrl}>
        <CatalogLoaderProvider>
          <SourceCodeProvider>
            <EntitiesProvider fileExtension={this.initArgs.fileExtension}>
              <SettingsProvider adapter={this.settingsAdapter}>
                <KaotoBridge
                  ref={this.editorRef}
                  channelType={this.initArgs.channel}
                  onReady={this.sendReady}
                  onNewEdit={this.sendNewEdit}
                  setNotifications={this.sendNotifications}
                  onStateControlCommandUpdate={this.sendStateControlCommand}
                  getMetadata={this.getMetadata}
                  setMetadata={this.setMetadata}
                  getResourceContent={this.getResourceContent}
                  saveResourceContent={this.saveResourceContent}
                  deleteResource={this.deleteResource}
                  askUserForFileSelection={this.askUserForFileSelection}
                >
                  <RouterProvider router={kaotoEditorRouter} />
                </KaotoBridge>
              </SettingsProvider>
            </EntitiesProvider>
          </SourceCodeProvider>
        </CatalogLoaderProvider>
      </RuntimeProvider>
    );
  }
}
