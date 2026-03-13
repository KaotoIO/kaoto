import { LocalStorageKeys } from '../local-storage-keys';
import { LocalStorageSettingsAdapter } from './localstorage-settings-adapter';
import { CanvasLayoutDirection, ColorScheme, NodeLabelType, NodeToolbarTrigger, SettingsModel } from './settings.model';

describe('LocalStorageSettingsAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create an instance with the default settings', () => {
    const adapter = new LocalStorageSettingsAdapter();

    expect(adapter.getSettings()).toEqual(new SettingsModel());
  });

  it('should save and retrieve settings', () => {
    const adapter = new LocalStorageSettingsAdapter();
    const newSettings: SettingsModel = {
      catalogUrl: 'http://example.com',
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

  it('should retrieve the saved settings from localStorage after creating a new instance', () => {
    const localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');

    expect(() => {
      return new LocalStorageSettingsAdapter();
    }).not.toThrow();

    expect(localStorageGetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.Settings);
  });

  it('should save the settings to localStorage', () => {
    const localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    const adapter = new LocalStorageSettingsAdapter();
    const newSettings: SettingsModel = {
      catalogUrl: 'http://example.com',
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

    expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.Settings, JSON.stringify(newSettings));
  });
});
