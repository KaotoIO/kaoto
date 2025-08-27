jest.mock('react-router-dom');
import {
  ChannelType,
  EditorApi,
  EditorInitArgs,
  EditorTheme,
  KogitoEditorEnvelopeContextType,
  StateControlCommand,
} from '@kie-tools-core/editor/dist/api';
import { ApiRequests } from '@kie-tools-core/envelope-bus/dist/api';
import { I18nService } from '@kie-tools-core/i18n/dist/envelope/I18nService';
import { KeyboardShortcutsService } from '@kie-tools-core/keyboard-shortcuts/dist/envelope/KeyboardShortcutsService';
import { OperatingSystem } from '@kie-tools-core/operating-system/dist/OperatingSystem';
import { RefObject } from 'react';
import { CatalogKind, StepUpdateAction } from '../models';
import { AbstractSettingsAdapter, ColorScheme, DefaultSettingsAdapter } from '../models/settings';
import { setColorScheme } from '../utils/color-scheme';
import { EditService } from './EditService';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';

jest.mock('../utils/color-scheme');

describe('KaotoEditorApp', () => {
  let kaotoEditorApp: KaotoEditorAppTest;
  let editService: EditService;
  let editorRef: RefObject<EditorApi>;
  let envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
  let initArgs: EditorInitArgs;
  let settingsAdapter: AbstractSettingsAdapter;

  beforeEach(() => {
    jest.resetModules();
    editService = EditService.getInstance();
    editorRef = {
      current: {
        setContent: jest.fn(),
        getContent: jest.fn(),
        getPreview: jest.fn(),
        undo: jest.fn(),
        redo: jest.fn(),
        setTheme: jest.fn(),
        validate: jest.fn(),
      },
    };

    envelopeContext = {
      supportedThemes: [EditorTheme.DARK, EditorTheme.LIGHT],
      channelApi: {
        notifications: {
          kogitoEditor_ready: getNotificationMock(),
          kogitoEditor_setContentError: getNotificationMock(),
          kogitoEditor_stateControlCommandUpdate: getNotificationMock(),
          kogitoNotifications_createNotification: getNotificationMock(),
          kogitoNotifications_removeNotifications: getNotificationMock(),
          kogitoNotifications_setNotifications: getNotificationMock(),
          kogitoWorkspace_newEdit: getNotificationMock(),
          kogitoWorkspace_openFile: getNotificationMock(),
        },
        requests: {
          getMetadata: jest.fn(),
          setMetadata: jest.fn(),
          getResourceContent: jest.fn(),
          saveResourceContent: jest.fn(),
          onStepUpdated: jest.fn(),
        } as unknown as ApiRequests<KaotoEditorChannelApi>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shared: {} as any,
      },
      operatingSystem: OperatingSystem.LINUX,
      services: {
        keyboardShortcuts: {} as KeyboardShortcutsService,
        i18n: {} as I18nService,
      },
    };

    initArgs = {
      resourcesPathPrefix: 'route.camel',
      fileExtension: 'yaml',
      initialLocale: 'en-us',
      isReadOnly: false,
      channel: ChannelType.VSCODE_DESKTOP,
      workspaceRootAbsolutePosixPath: '/workspace',
    };

    settingsAdapter = new DefaultSettingsAdapter();

    kaotoEditorApp = new KaotoEditorAppTest(envelopeContext, initArgs, settingsAdapter);
    kaotoEditorApp.setEditorRef(editorRef);
  });

  afterEach(() => {
    editService.clearEdits();
  });

  describe('setContent', () => {
    it('should check if the edit is stale', async () => {
      const isStaleEditSpy = jest.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(true);

      await kaotoEditorApp.setContent('path', 'content');

      expect(isStaleEditSpy).toHaveBeenCalledWith('content');
    });

    it('should not do anything if the edit is stale', async () => {
      jest.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(true);

      await kaotoEditorApp.setContent('path', 'content');

      expect(editorRef.current!.setContent).not.toHaveBeenCalled();
    });

    it('should clear the hashes when the edit is not stale', async () => {
      jest.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(false);
      const clearHashesSpy = jest.spyOn(editService, 'clearEdits');

      await kaotoEditorApp.setContent('path', 'content');

      expect(clearHashesSpy).toHaveBeenCalled();
    });

    it('should delegate to the channelApi if the edit is not stale', async () => {
      jest.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(false);

      await kaotoEditorApp.setContent('path', 'content');

      expect(editorRef.current!.setContent).toHaveBeenCalledWith('path', 'content');
    });
  });

  it('getContent', async () => {
    (editorRef.current!.getContent as jest.Mock).mockResolvedValue('content');

    const content = await kaotoEditorApp.getContent();

    expect(content).toBe('content');
  });

  it('getPreview', async () => {
    (editorRef.current!.getPreview as jest.Mock).mockResolvedValue('preview');

    const preview = await kaotoEditorApp.getPreview();

    expect(preview).toBe('preview');
  });

  it('undo', async () => {
    await kaotoEditorApp.undo();

    expect(editorRef.current!.undo).toHaveBeenCalled();
  });

  it('redo', async () => {
    await kaotoEditorApp.redo();

    expect(editorRef.current!.redo).toHaveBeenCalled();
  });

  it('validate', async () => {
    (editorRef.current!.validate as jest.Mock).mockResolvedValue([]);

    const notifications = await kaotoEditorApp.validate();

    expect(notifications).toEqual([]);
  });

  it('setTheme', async () => {
    await kaotoEditorApp.setTheme(EditorTheme.DARK);

    expect(editorRef.current!.setTheme).toHaveBeenCalledWith(EditorTheme.DARK);
  });

  it('sendReady', () => {
    kaotoEditorApp.sendReady();

    expect(envelopeContext.channelApi.notifications.kogitoEditor_ready.send).toHaveBeenCalled();
  });

  describe('sendNewEdit', () => {
    it('should register the content with the EditService', async () => {
      const registerSpy = jest.spyOn(editService, 'registerEdit');
      await kaotoEditorApp.sendNewEdit('content');

      expect(registerSpy).toHaveBeenCalledWith('content');
    });

    it('should delegate to the channelApi', async () => {
      await kaotoEditorApp.sendNewEdit('content');

      expect(envelopeContext.channelApi.notifications.kogitoWorkspace_newEdit.send).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'content' }),
      );
    });
  });

  it('sendNotifications', () => {
    kaotoEditorApp.sendNotifications('path', []);

    expect(envelopeContext.channelApi.notifications.kogitoNotifications_setNotifications.send).toHaveBeenCalled();
  });

  it('sendStateControlCommand', () => {
    kaotoEditorApp.sendStateControlCommand(StateControlCommand.REDO);

    expect(envelopeContext.channelApi.notifications.kogitoEditor_stateControlCommandUpdate.send).toHaveBeenCalledWith(
      StateControlCommand.REDO,
    );
  });

  it('should delegate to the channelApi getting metadata from the Kaoto metadata file', async () => {
    await kaotoEditorApp.getMetadata('path');

    expect(envelopeContext.channelApi.requests.getMetadata).toHaveBeenCalledWith('path');
  });

  it('should delegate to the channelApi setting metadata from the Kaoto metadata file', async () => {
    await kaotoEditorApp.setMetadata('key', 'value');

    expect(envelopeContext.channelApi.requests.setMetadata).toHaveBeenCalledWith('key', 'value');
  });

  it('should delegate to the channelApi getting a file resource content', async () => {
    await kaotoEditorApp.getResourceContent('path');

    expect(envelopeContext.channelApi.requests.getResourceContent).toHaveBeenCalledWith('path');
  });

  it('should delegate to the channelApi saving file resource content', async () => {
    await kaotoEditorApp.saveResourceContent('path', 'content');

    expect(envelopeContext.channelApi.requests.saveResourceContent).toHaveBeenCalledWith('path', 'content');
  });

  it('should set the color theme upon opening the editor', () => {
    kaotoEditorApp.af_onOpen();

    expect(setColorScheme).toHaveBeenCalledWith(ColorScheme.Auto);
  });

  it('should notify when a new step is added', async () => {
    const stepType = CatalogKind.Component;
    const stepName = 'amqp';

    await kaotoEditorApp.onStepUpdated(StepUpdateAction.Add, stepType, stepName);

    expect(envelopeContext.channelApi.requests.onStepUpdated).toHaveBeenCalledWith(
      StepUpdateAction.Add,
      stepType,
      stepName,
    );
  });
});

const getNotificationMock = () => ({
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  send: jest.fn(),
});

class KaotoEditorAppTest extends KaotoEditorApp {
  setEditorRef(editorRef: RefObject<EditorApi>) {
    this.editorRef = editorRef;
  }
}
