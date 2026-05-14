import { LocalStorageKeys } from '../local-storage-keys';
import { LocalStorageSettingsAdapter } from './localstorage-settings-adapter';
import { CanvasLayoutDirection, ColorScheme, NodeLabelType, NodeToolbarTrigger, SettingsModel } from './settings.model';

describe('LocalStorageSettingsAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create an instance with default settings', () => {
    const settings = new LocalStorageSettingsAdapter().getSettings();

    expect(settings).toEqual(new SettingsModel());
  });

  it('should save and retrieve settings', () => {
    const adapter = new LocalStorageSettingsAdapter();
    const newSettings: SettingsModel = {
      catalogUrl: 'http://example.com',
      camelCatalog: { version: '4.18.0', runtime: 'Quarkus' },
      citrusCatalog: { version: '4.10.1', runtime: 'Citrus' },
      nodeLabel: NodeLabelType.Description,
      nodeToolbarTrigger: NodeToolbarTrigger.onSelection,
      colorScheme: ColorScheme.Auto,
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };

    adapter.saveSettings(newSettings);

    expect(adapter.getSettings()).toEqual(newSettings);
  });

  it('should persist settings across instances', () => {
    const settings: SettingsModel = {
      catalogUrl: 'http://example.com',
      camelCatalog: { version: '4.18.0', runtime: 'Quarkus' },
      citrusCatalog: { version: '4.10.1', runtime: 'Citrus' },
      nodeLabel: NodeLabelType.Description,
      nodeToolbarTrigger: NodeToolbarTrigger.onSelection,
      colorScheme: ColorScheme.Auto,
      rest: {
        apicurioRegistryUrl: '',
        customMediaTypes: [],
      },
      canvasLayoutDirection: CanvasLayoutDirection.SelectInCanvas,
    };

    new LocalStorageSettingsAdapter().saveSettings(settings);
    const retrievedSettings = new LocalStorageSettingsAdapter().getSettings();

    expect(retrievedSettings).toEqual(settings);
  });

  it('should migrate old catalog to appropriate field and remove old key', () => {
    const testCases = [
      {
        old: { version: '4.14.5', runtime: 'Main' },
        expected: {
          camelCatalog: { version: '4.14.5', runtime: 'Main' },
          citrusCatalog: { version: '4.10.1', runtime: 'Citrus' },
        },
      },
      {
        old: { version: '4.10.1', runtime: 'Citrus' },
        expected: {
          camelCatalog: { version: '4.18.0', runtime: 'Main' },
          citrusCatalog: { version: '4.10.1', runtime: 'Citrus' },
        },
      },
    ];

    testCases.forEach(({ old, expected }) => {
      localStorage.clear();
      localStorage.setItem(LocalStorageKeys.SelectedCatalog, JSON.stringify(old));

      const settings = new LocalStorageSettingsAdapter().getSettings();

      expect(settings.camelCatalog).toEqual(expected.camelCatalog);
      expect(settings.citrusCatalog).toEqual(expected.citrusCatalog);
      expect(localStorage.getItem(LocalStorageKeys.SelectedCatalog)).toBeNull();
    });
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
        camelCatalog: { version: '4.18.0', runtime: 'Quarkus' },
        citrusCatalog: { version: '4.10.1', runtime: 'Citrus' },
      }),
    );

    const settings = new LocalStorageSettingsAdapter().getSettings();

    expect(settings.camelCatalog).toEqual({ version: '4.18.0', runtime: 'Quarkus' });
    expect(settings.citrusCatalog).toEqual({ version: '4.10.1', runtime: 'Citrus' });
    expect(localStorage.getItem(LocalStorageKeys.SelectedCatalog)).toBeNull();
  });

  it('should use defaults when migration fails', () => {
    const testCases = [
      'undefined', // string 'undefined'
      '{invalid json', // corrupted JSON
      JSON.stringify({ name: 'test' }), // missing version/runtime
      null, // no old catalog
    ];

    testCases.forEach((testData) => {
      localStorage.clear();
      if (testData !== null) {
        localStorage.setItem(LocalStorageKeys.SelectedCatalog, testData);
      }

      const settings = new LocalStorageSettingsAdapter().getSettings();

      expect(settings.camelCatalog).toEqual({ version: '4.18.0', runtime: 'Main' });
      expect(settings.citrusCatalog).toEqual({ version: '4.10.1', runtime: 'Citrus' });
    });
  });
});
