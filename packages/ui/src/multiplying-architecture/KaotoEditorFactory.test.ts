jest.mock('./KaotoEditorApp');
jest.mock('react-router-dom');
import { EditorInitArgs, KogitoEditorEnvelopeContextType } from '@kie-tools-core/editor/dist/api';

import { ColorScheme, ISettingsModel, NodeLabelType, NodeToolbarTrigger } from '../models';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { KaotoEditorFactory } from './KaotoEditorFactory';

describe('KaotoEditorFactory', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should create editor', async () => {
    const settingsModel: ISettingsModel = {
      catalogUrl: 'catalog-url',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      experimentalFeatures: {
        enableDragAndDrop: false,
      },
    };

    const envelopeContext = {
      channelApi: {
        requests: {
          getVSCodeKaotoSettings: () => Promise.resolve(settingsModel),
          getCatalogURL: function (): Promise<string | undefined> {
            throw new Error('Function not implemented.');
          },
        },
      },
    } as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
    const initArgs = {} as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(editor).toBeInstanceOf(KaotoEditorApp);
  });

  it('should get settings', async () => {
    const settingsModel: ISettingsModel = {
      catalogUrl: 'catalog-url',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      experimentalFeatures: {
        enableDragAndDrop: false,
      },
    };

    const getVSCodeKaotoSettingsSpy = jest.fn().mockResolvedValue(settingsModel);
    const getCatalogURLSpy = jest.fn().mockRejectedValue(settingsModel);

    const envelopeContext = {
      channelApi: {
        requests: {
          getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
          getCatalogURL: getCatalogURLSpy,
        },
      },
    } as unknown as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
    const initArgs = {} as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(getVSCodeKaotoSettingsSpy).toHaveBeenCalledTimes(1);
    expect(getCatalogURLSpy).not.toHaveBeenCalled();
    expect(editor).toBeDefined();
  });

  it('should fallback to previous API if getVSCodeKaotoSettings is not implemented', async () => {
    const getVSCodeKaotoSettingsSpy = jest.fn().mockImplementation(() => new Promise(() => {}));
    const getCatalogURLSpy = jest.fn().mockResolvedValue('');

    const envelopeContext = {
      channelApi: {
        requests: {
          getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
          getCatalogURL: getCatalogURLSpy,
        },
      },
    } as unknown as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
    const initArgs = {} as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(getVSCodeKaotoSettingsSpy).toHaveBeenCalledTimes(1);
    expect(getCatalogURLSpy).toHaveBeenCalledTimes(1);
    expect(editor).toBeDefined();
  });

  it('should update catalog URL', async () => {
    const settingsModel: ISettingsModel = {
      catalogUrl: '',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      experimentalFeatures: {
        enableDragAndDrop: false,
      },
    };
    const expectedSettings: ISettingsModel = {
      catalogUrl: 'path-prefix/camel-catalog/index.json',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      experimentalFeatures: {
        enableDragAndDrop: false,
      },
    };

    const getVSCodeKaotoSettingsSpy = jest.fn().mockResolvedValue(settingsModel);
    const getCatalogURLSpy = jest.fn().mockRejectedValue(settingsModel);

    const envelopeContext = {
      channelApi: {
        requests: {
          getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
          getCatalogURL: getCatalogURLSpy,
        },
      },
    } as unknown as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;
    const initArgs = {
      resourcesPathPrefix: 'path-prefix',
    } as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(KaotoEditorApp).toHaveBeenCalledWith(
      envelopeContext,
      initArgs,
      expect.objectContaining({
        settings: expectedSettings,
      }),
    );
    expect(editor).toBeDefined();
  });
});
