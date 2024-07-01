import {
  Editor,
  EditorApi,
  EditorInitArgs,
  EditorTheme,
  KogitoEditorEnvelopeContextType,
} from '@kie-tools-core/editor/dist/api';
import { Notification } from '@kie-tools-core/notifications/dist/api';
import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { RefObject, createRef } from 'react';
import { EntitiesProvider } from '../providers/entities.provider';
import { SourceCodeProvider } from '../providers/source-code.provider';
import { KaotoBridge } from './KaotoBridge';
import { KaotoEditor } from './KaotoEditor';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';

export class KaotoEditorApp implements Editor {
  private readonly editorRef: RefObject<EditorApi>;
  af_isReact = true;
  af_componentId = 'kaoto-editor';
  af_componentTitle = 'Kaoto Editor';

  constructor(
    private readonly envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>,
    private readonly initArgs: EditorInitArgs,
    private readonly catalogUrl: string,
  ) {
    this.editorRef = createRef<EditorApi>();
  }

  async getElementPosition() {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    };
  }

  async setContent(path: string, content: string): Promise<void> {
    return this.editorRef.current?.setContent(path, content);
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

  af_componentRoot() {
    return (
      <SourceCodeProvider>
        <EntitiesProvider>
          <KaotoBridge
            ref={this.editorRef}
            channelType={this.initArgs.channel}
            onReady={() => this.envelopeContext.channelApi.notifications.kogitoEditor_ready.send()}
            onNewEdit={(edit) => {
              this.envelopeContext.channelApi.notifications.kogitoWorkspace_newEdit.send(edit);
            }}
            setNotifications={(path, notifications) =>
              this.envelopeContext.channelApi.notifications.kogitoNotifications_setNotifications.send(
                path,
                notifications,
              )
            }
            onStateControlCommandUpdate={(command) =>
              this.envelopeContext.channelApi.notifications.kogitoEditor_stateControlCommandUpdate.send(command)
            }
            catalogUrl={this.catalogUrl}
          >
            <KaotoEditor />
          </KaotoBridge>
        </EntitiesProvider>
      </SourceCodeProvider>
    );
  }
}
