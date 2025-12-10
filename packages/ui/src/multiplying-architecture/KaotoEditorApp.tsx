import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first

import { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
import {
  Editor,
  EditorInitArgs,
  EditorTheme,
  KogitoEditorEnvelopeContextType,
  StateControlCommand,
} from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import { WorkspaceEdit } from '@kie-tools-core/workspace/dist/api';
import { createRef, RefObject } from 'react';
import { RouterProvider } from 'react-router-dom';

import { CatalogLoaderProvider } from '../dynamic-catalog/catalog.provider';
import { CatalogKind, StepUpdateAction } from '../models';
import { AbstractSettingsAdapter } from '../models/settings';
import { EntitiesProvider } from '../providers/entities.provider';
import { ReloadProvider } from '../providers/reload.provider';
import { RuntimeProvider } from '../providers/runtime.provider';
import { SettingsProvider } from '../providers/settings.provider';
import { SourceCodeProvider } from '../providers/source-code.provider';
import { promiseTimeout } from '../utils';
import { setColorScheme } from '../utils/color-scheme';
import { SourceCodeBridgeProviderRef } from './Bridge/editor-api';
import { KaotoBridge } from './Bridge/KaotoBridge';
import { SourceCodeBridgeProvider } from './Bridge/SourceCodeBridgeProvider';
import { EditService } from './EditService';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { kaotoEditorRouter } from './KaotoEditorRouter';

export class KaotoEditorApp implements Editor {
  protected editorRef: RefObject<SourceCodeBridgeProviderRef | null>;
  af_isReact = true;
  af_componentId = 'kaoto-editor';
  af_componentTitle = 'Kaoto Editor';

  constructor(
    protected readonly envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    protected readonly initArgs: EditorInitArgs,
    protected readonly settingsAdapter: AbstractSettingsAdapter,
  ) {
    this.editorRef = createRef<SourceCodeBridgeProviderRef>();
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
    this.getSuggestions = this.getSuggestions.bind(this);
    this.onStepUpdated = this.onStepUpdated.bind(this);
  }

  async setContent(path: string, content: string): Promise<void> {
    const isStaleEdit = await EditService.getInstance().isStaleEdit(content);

    if (isStaleEdit) {
      return;
    }

    EditService.getInstance().clearEdits();

    await this.editorRef.current?.setContent(path, content);
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

  async getSuggestions(topic: string, word: string, context: SuggestionRequestContext): Promise<Suggestion[]> {
    try {
      return await promiseTimeout(
        this.envelopeContext.channelApi.requests.getSuggestions(topic, word, context),
        2_000,
        [],
      );
    } catch (error) {
      return []; // Return an empty array in case of error to avoid breaking the editor
    }
  }

  async onStepUpdated(action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> {
    return this.envelopeContext.channelApi.requests.onStepUpdated(action, stepType, stepName);
  }

  af_onOpen(): void {
    setColorScheme(this.settingsAdapter.getSettings().colorScheme);
  }

  af_componentRoot() {
    return (
      <ReloadProvider>
        <SettingsProvider adapter={this.settingsAdapter}>
          <SourceCodeProvider>
            <SourceCodeBridgeProvider ref={this.editorRef} onNewEdit={this.sendNewEdit}>
              <RuntimeProvider catalogUrl={this.settingsAdapter.getSettings().catalogUrl}>
                <CatalogLoaderProvider>
                  <EntitiesProvider fileExtension={this.initArgs.fileExtension}>
                    <KaotoBridge
                      channelType={this.initArgs.channel}
                      onReady={this.sendReady}
                      setNotifications={this.sendNotifications}
                      onStateControlCommandUpdate={this.sendStateControlCommand}
                      getMetadata={this.getMetadata}
                      setMetadata={this.setMetadata}
                      getResourceContent={this.getResourceContent}
                      saveResourceContent={this.saveResourceContent}
                      deleteResource={this.deleteResource}
                      askUserForFileSelection={this.askUserForFileSelection}
                      getSuggestions={this.getSuggestions}
                      shouldSaveSchema={false}
                      onStepUpdated={this.onStepUpdated}
                    >
                      <RouterProvider router={kaotoEditorRouter} />
                    </KaotoBridge>
                  </EntitiesProvider>
                </CatalogLoaderProvider>
              </RuntimeProvider>
            </SourceCodeBridgeProvider>
          </SourceCodeProvider>
        </SettingsProvider>
      </ReloadProvider>
    );
  }
}
