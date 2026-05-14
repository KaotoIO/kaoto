import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { LocalStorageKeys } from '../local-storage-keys';
import { LocalStorageSettingsAdapter } from './localstorage-settings-adapter';
import { CanvasLayoutDirection, ColorScheme, NodeLabelType, NodeToolbarTrigger, SettingsModel } from './settings.model';

describe('LocalStorageSettingsAdapter', () => {
  const customCatalogLibrary: CatalogLibrary = {
    name: 'Custom Catalog',
    version: 1,
    definitions: [
      {
        name: 'Camel Quarkus 4.18.1',
        version: '4.18.1',
        runtime: 'Quarkus',
      },
      {
        name: 'Citrus 4.10.2',
        version: '4.10.2',
        runtime: 'Citrus',
      },
    ] as CatalogLibrary['definitions'],
  };

  const createSettings = (overrides: Partial<SettingsModel> = {}): SettingsModel => ({
    catalogUrl: 'http://example.com',
    camelCatalog: { version: '4.18.0', runtime: 'Quarkus' },
    testingCatalog: { version: '4.10.1', runtime: 'Citrus' },
    nodeLabel: NodeLabelType.Description,
    nodeToolbarTrigger: NodeToolbarTrigger.onSelection,
    colorScheme: ColorScheme.Auto,
    rest: {
      apicurioRegistryUrl: '',
      customMediaTypes: [],
    },
    canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => customCatalogLibrary,
    } as unknown as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create an instance with default settings', () => {
    const settings = new LocalStorageSettingsAdapter().getSettings();

    expect(settings).toEqual(new SettingsModel());
  });

  it('should persist settings across instances', async () => {
    const settings = createSettings();

    await new LocalStorageSettingsAdapter().saveSettings(settings);
    const retrievedSettings = new LocalStorageSettingsAdapter().getSettings();

    expect(retrievedSettings).toEqual({
      ...settings,
      camelCatalog: { version: '4.18.1', runtime: 'Quarkus' },
      testingCatalog: { version: '4.10.2', runtime: 'Citrus' },
    });
  });

  it('should preserve existing testing catalog when custom catalog has no test runtimes', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        name: 'Camel Only Catalog',
        version: 1,
        definitions: [
          {
            name: 'Camel Quarkus 4.18.1',
            version: '4.18.1',
            runtime: 'Quarkus',
          },
        ] as CatalogLibrary['definitions'],
      }),
    });

    const adapter = new LocalStorageSettingsAdapter();
    const settings = createSettings();

    await adapter.saveSettings(settings);

    expect(adapter.getSettings().testingCatalog).toEqual({ version: '4.10.1', runtime: 'Citrus' });
  });

  it.each([
    [
      { version: '4.14.5', runtime: 'Main' },
      {
        camelCatalog: { version: '4.14.5', runtime: 'Main' },
        testingCatalog: { version: '', runtime: 'Citrus' },
      },
    ],
    [
      { version: '4.10.1', runtime: 'Citrus' },
      {
        camelCatalog: { version: '', runtime: 'Main' },
        testingCatalog: { version: '4.10.1', runtime: 'Citrus' },
      },
    ],
  ])('should migrate old catalog to appropriate field and remove old key', (old, expected) => {
    localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(old));

    const settings = new LocalStorageSettingsAdapter().getSettings();

    expect(settings.camelCatalog).toEqual(expected.camelCatalog);
    expect(settings.testingCatalog).toEqual(expected.testingCatalog);
    expect(localStorage.getItem(LocalStorageKeys.SelectedCatalog)).toBeNull();
  });

  it('should not overwrite existing catalogs', () => {
    localStorage.setItem(
      LocalStorageKeys.SelectedCatalog,
      JSON.stringify({
        version: '4.14.5',
        runtime: 'Main',
      }),
    );
    localStorage.setItem(
      LocalStorageKeys.Settings,
      JSON.stringify({
        camelCatalog: { version: '4.18.1', runtime: 'Quarkus' },
        testingCatalog: { version: '4.10.1', runtime: 'Citrus' },
      }),
    );

    const settings = new LocalStorageSettingsAdapter().getSettings();

    expect(settings.camelCatalog).toEqual({ version: '4.18.1', runtime: 'Quarkus' });
    expect(settings.testingCatalog).toEqual({ version: '4.10.1', runtime: 'Citrus' });
    expect(localStorage.getItem(LocalStorageKeys.SelectedCatalog)).toBeNull();
  });

  it.each(['undefined', '{invalid json', JSON.stringify({ name: 'test' }), null])(
    'should use defaults when migration fails for %p',
    (testData) => {
      if (testData !== null) {
        localStorage.setItem(LocalStorageKeys.SelectedCatalog, testData);
      }

      const settings = new LocalStorageSettingsAdapter().getSettings();

      expect(settings.camelCatalog).toEqual({ version: '', runtime: 'Main' });
      expect(settings.testingCatalog).toEqual({ version: '', runtime: 'Citrus' });
    },
  );
});
