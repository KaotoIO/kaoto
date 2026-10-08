import { EditorInitArgs, KogitoEditorEnvelopeContextType } from '@kie-tools-core/editor/dist/api';

import { CanvasLayoutDirection, ColorScheme, ISettingsModel, NodeLabelType, NodeToolbarTrigger } from '../models';
import { KaotoEditorApp } from './KaotoEditorApp';
import { KaotoEditorChannelApi } from './KaotoEditorChannelApi';
import { KaotoEditorFactory } from './KaotoEditorFactory';

type SettingsRequests = Pick<
  KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>['channelApi']['requests'],
  'getVSCodeKaotoSettings' | 'getCatalogURL'
>;

/** An envelope context exposing only the settings requests used by the factory */
const createEnvelopeContext = (requests: SettingsRequests) =>
  ({ channelApi: { requests } }) as KogitoEditorEnvelopeContextType<KaotoEditorChannelApi>;

describe('KaotoEditorFactory', () => {
  it('should create editor', async () => {
    const settingsModel: ISettingsModel = {
      catalogUrl: 'catalog-url',
      runtimeCatalogName: '',
      testingCatalogName: '',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };

    const envelopeContext = createEnvelopeContext({
      getVSCodeKaotoSettings: () => Promise.resolve(settingsModel),
      getCatalogURL: function (): Promise<string | undefined> {
        throw new Error('Function not implemented.');
      },
    });
    const initArgs = {} as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(editor).toBeInstanceOf(KaotoEditorApp);
  });

  it('should get settings', async () => {
    const settingsModel: ISettingsModel = {
      catalogUrl: 'catalog-url',
      runtimeCatalogName: '',
      testingCatalogName: '',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };

    const getVSCodeKaotoSettingsSpy = vi
      .fn<SettingsRequests['getVSCodeKaotoSettings']>()
      .mockResolvedValue(settingsModel);
    const getCatalogURLSpy = vi.fn<SettingsRequests['getCatalogURL']>().mockRejectedValue(settingsModel);

    const envelopeContext = createEnvelopeContext({
      getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
      getCatalogURL: getCatalogURLSpy,
    });
    const initArgs = {} as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(getVSCodeKaotoSettingsSpy).toHaveBeenCalledTimes(1);
    expect(getCatalogURLSpy).not.toHaveBeenCalled();
    expect(editor).toBeDefined();
  });

  it('should fallback to previous API if getVSCodeKaotoSettings is not implemented', async () => {
    const getVSCodeKaotoSettingsSpy = vi
      .fn<SettingsRequests['getVSCodeKaotoSettings']>()
      .mockImplementation(() => new Promise(() => {}));
    const getCatalogURLSpy = vi.fn<SettingsRequests['getCatalogURL']>().mockResolvedValue('');

    const envelopeContext = createEnvelopeContext({
      getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
      getCatalogURL: getCatalogURLSpy,
    });
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
      runtimeCatalogName: '',
      testingCatalogName: '',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };
    const expectedSettings: ISettingsModel = {
      catalogUrl: 'path-prefix/camel-catalog/index.json',
      runtimeCatalogName: '',
      testingCatalogName: '',
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      nodeLabel: NodeLabelType.Id,
      nodeToolbarTrigger: NodeToolbarTrigger.onHover,
      colorScheme: ColorScheme.Auto,
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };

    const getVSCodeKaotoSettingsSpy = vi
      .fn<SettingsRequests['getVSCodeKaotoSettings']>()
      .mockResolvedValue(settingsModel);
    const getCatalogURLSpy = vi.fn<SettingsRequests['getCatalogURL']>().mockRejectedValue(settingsModel);

    const envelopeContext = createEnvelopeContext({
      getVSCodeKaotoSettings: getVSCodeKaotoSettingsSpy,
      getCatalogURL: getCatalogURLSpy,
    });
    const initArgs = {
      resourcesPathPrefix: 'path-prefix',
    } as EditorInitArgs;
    const factory = new KaotoEditorFactory();

    const editor = await factory.createEditor(envelopeContext, initArgs);

    expect(editor).toBeInstanceOf(KaotoEditorApp);
    /* The editor is created with the given envelope context and init args, and the updated settings */
    expect(editor).toEqual(
      expect.objectContaining({
        envelopeContext,
        initArgs,
        settingsAdapter: expect.objectContaining({
          settings: expectedSettings,
        }),
      }),
    );
  });
});
