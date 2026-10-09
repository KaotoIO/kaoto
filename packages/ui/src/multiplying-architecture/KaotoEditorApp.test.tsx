import { CatalogKind, ColorScheme, FileTypes, StepUpdateAction } from '@kaoto/editor-api';
import { SuggestionRequestContext } from '@kaoto/forms';
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

import { AbstractSettingsAdapter, DefaultSettingsAdapter } from '../models/settings';
import { DARK_MODE_CARBON_ATTR_NAME, DARK_MODE_PATTERN_FLY_CLASS_NAME } from '../utils/color-scheme';
import { EditService } from './EditService';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';

type UsedRequests =
  | 'getMetadata'
  | 'setMetadata'
  | 'getResourcesContentByType'
  | 'getResourceContent'
  | 'saveResourceContent'
  | 'isResourceExist'
  | 'deleteResource'
  | 'askUserForFileSelection'
  | 'getSuggestions'
  | 'onStepUpdated';

describe('KaotoEditorApp', () => {
  let kaotoEditorApp: KaotoEditorAppTest;
  let editService: EditService;
  let editorRef: RefObject<EditorApi>;
  let envelopeContext: KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
  let initArgs: EditorInitArgs;
  let settingsAdapter: AbstractSettingsAdapter;

  beforeEach(() => {
    editService = EditService.getInstance();
    editorRef = {
      current: {
        setContent: vi.fn(),
        getContent: vi.fn(),
        getPreview: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        setTheme: vi.fn(),
        validate: vi.fn(),
      },
    };

    /* Only the requests used by KaotoEditorApp */
    const requests: Pick<ApiRequests<KaotoEditorChannelApi>, UsedRequests> = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourcesContentByType: vi.fn(),
      getResourceContent: vi.fn(),
      saveResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      getSuggestions: vi.fn(),
      onStepUpdated: vi.fn(),
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
        requests: requests as ApiRequests<KaotoEditorChannelApi>,
        shared: {} as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>['channelApi']['shared'],
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
      const isStaleEditSpy = vi.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(true);

      await kaotoEditorApp.setContent('path', 'content');

      expect(isStaleEditSpy).toHaveBeenCalledWith('content');
    });

    it('should not do anything if the edit is stale', async () => {
      vi.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(true);

      await kaotoEditorApp.setContent('path', 'content');

      expect(editorRef.current!.setContent).not.toHaveBeenCalled();
    });

    it('should clear the hashes when the edit is not stale', async () => {
      vi.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(false);
      const clearHashesSpy = vi.spyOn(editService, 'clearEdits');

      await kaotoEditorApp.setContent('path', 'content');

      expect(clearHashesSpy).toHaveBeenCalled();
    });

    it('should delegate to the channelApi if the edit is not stale', async () => {
      vi.spyOn(editService, 'isStaleEdit').mockResolvedValueOnce(false);

      await kaotoEditorApp.setContent('path', 'content');

      expect(editorRef.current!.setContent).toHaveBeenCalledWith('path', 'content');
    });
  });

  it('getContent', async () => {
    vi.mocked(editorRef.current!.getContent).mockResolvedValue('content');

    const content = await kaotoEditorApp.getContent();

    expect(content).toBe('content');
  });

  it('getPreview', async () => {
    vi.mocked(editorRef.current!.getPreview).mockResolvedValue('preview');

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
    vi.mocked(editorRef.current!.validate).mockResolvedValue([]);

    const notifications = await kaotoEditorApp.validate();

    expect(notifications).toEqual([]);
  });

  it('setTheme', async () => {
    await kaotoEditorApp.setTheme(EditorTheme.DARK);

    expect(editorRef.current!.setTheme).toHaveBeenCalledWith(EditorTheme.DARK);
  });

  it('sendReady', async () => {
    await kaotoEditorApp.sendReady();

    expect(envelopeContext.channelApi.notifications.kogitoEditor_ready.send).toHaveBeenCalled();
  });

  describe('sendNewEdit', () => {
    it('should register the content with the EditService', async () => {
      const registerSpy = vi.spyOn(editService, 'registerEdit');
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

  it('should delegate to the channelApi getting resources content by type', async () => {
    const mockResponse = [{ filename: 'my-kamelet.kamelet.yaml', content: 'kind: Kamelet' }];
    vi.mocked(envelopeContext.channelApi.requests.getResourcesContentByType).mockResolvedValue(mockResponse);

    const result = await kaotoEditorApp.getResourcesContentByType(FileTypes.Kamelets);

    expect(envelopeContext.channelApi.requests.getResourcesContentByType).toHaveBeenCalledWith(FileTypes.Kamelets);
    expect(result).toEqual(mockResponse);
  });

  it('should delegate to the channelApi getting a file resource content', async () => {
    await kaotoEditorApp.getResourceContent('path');

    expect(envelopeContext.channelApi.requests.getResourceContent).toHaveBeenCalledWith('path');
  });

  it('should delegate to the channelApi saving file resource content', async () => {
    await kaotoEditorApp.saveResourceContent('path', 'content');

    expect(envelopeContext.channelApi.requests.saveResourceContent).toHaveBeenCalledWith('path', 'content');
  });

  describe('color theme', () => {
    beforeEach(() => {
      /* `Auto` follows the system preference, report a dark system theme */
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    afterEach(() => {
      document.documentElement.classList.remove(DARK_MODE_PATTERN_FLY_CLASS_NAME);
      document.documentElement.removeAttribute(DARK_MODE_CARBON_ATTR_NAME);
    });

    it('should set the color theme upon opening the editor', async () => {
      expect(settingsAdapter.getSettings().colorScheme).toBe(ColorScheme.Auto);

      kaotoEditorApp.af_onOpen();

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(document.documentElement).toHaveClass(DARK_MODE_PATTERN_FLY_CLASS_NAME);
      expect(document.documentElement).toHaveAttribute(DARK_MODE_CARBON_ATTR_NAME, 'dark');
    });
  });

  it('should delegate to the channelApi checking if a resource exists', async () => {
    vi.mocked(envelopeContext.channelApi.requests.isResourceExist).mockResolvedValue(true);

    const exists = await kaotoEditorApp.isResourceExist('path');

    expect(envelopeContext.channelApi.requests.isResourceExist).toHaveBeenCalledWith('path');
    expect(exists).toBe(true);
  });

  it('should return false when resource does not exist', async () => {
    vi.mocked(envelopeContext.channelApi.requests.isResourceExist).mockResolvedValue(false);

    const exists = await kaotoEditorApp.isResourceExist('path');

    expect(envelopeContext.channelApi.requests.isResourceExist).toHaveBeenCalledWith('path');
    expect(exists).toBe(false);
  });

  it('should delegate to the channelApi deleting a resource', async () => {
    vi.mocked(envelopeContext.channelApi.requests.deleteResource).mockResolvedValue(true);

    const result = await kaotoEditorApp.deleteResource('path');

    expect(envelopeContext.channelApi.requests.deleteResource).toHaveBeenCalledWith('path');
    expect(result).toBe(true);
  });

  it('should delegate to the channelApi asking user for file selection', async () => {
    vi.mocked(envelopeContext.channelApi.requests.askUserForFileSelection).mockResolvedValue(['file1.txt']);

    const result = await kaotoEditorApp.askUserForFileSelection('**/*.txt', '**/*.log', { multiSelect: true });

    expect(envelopeContext.channelApi.requests.askUserForFileSelection).toHaveBeenCalledWith('**/*.txt', '**/*.log', {
      multiSelect: true,
    });
    expect(result).toEqual(['file1.txt']);
  });

  it('should delegate to the channelApi getting suggestions', async () => {
    const mockSuggestions = [{ label: 'test', value: 'test' }];
    const mockContext = {} as SuggestionRequestContext;
    vi.mocked(envelopeContext.channelApi.requests.getSuggestions).mockResolvedValue(mockSuggestions);

    const result = await kaotoEditorApp.getSuggestions('topic', 'word', mockContext);

    expect(envelopeContext.channelApi.requests.getSuggestions).toHaveBeenCalledWith('topic', 'word', mockContext);
    expect(result).toEqual(mockSuggestions);
  });

  it('should return empty array when getSuggestions times out', async () => {
    const mockContext = {} as SuggestionRequestContext;
    vi.mocked(envelopeContext.channelApi.requests.getSuggestions).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve([{ value: 'test' }]);
          }, 3000),
        ),
    );

    const result = await kaotoEditorApp.getSuggestions('topic', 'word', mockContext);

    expect(result).toEqual([]);
  });

  it('should return empty array when getSuggestions throws an error', async () => {
    const mockContext = {} as SuggestionRequestContext;
    vi.mocked(envelopeContext.channelApi.requests.getSuggestions).mockRejectedValue(new Error('test error'));

    const result = await kaotoEditorApp.getSuggestions('topic', 'word', mockContext);

    expect(result).toEqual([]);
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
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
});

class KaotoEditorAppTest extends KaotoEditorApp {
  setEditorRef(editorRef: RefObject<EditorApi>) {
    this.editorRef = editorRef;
  }
}
