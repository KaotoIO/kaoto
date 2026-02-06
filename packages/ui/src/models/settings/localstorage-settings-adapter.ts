import { LocalStorageKeys } from '../local-storage-keys';
import { AbstractSettingsAdapter, ISettingsModel, SettingsModel } from './settings.model';

export class LocalStorageSettingsAdapter implements AbstractSettingsAdapter {
  private settings: ISettingsModel;

  constructor() {
    const rawSettings = localStorage.getItem(LocalStorageKeys.Settings) ?? '{}';
    const parsedSettings: ISettingsModel = JSON.parse(rawSettings);
    parsedSettings.rest ??= {
      apicurioRegistryUrl: '',
      customMediaTypes: [],
    };

    this.settings = new SettingsModel(parsedSettings);
  }

  getSettings(): ISettingsModel {
    return this.settings;
  }

  saveSettings(settings: ISettingsModel): void {
    localStorage.setItem(LocalStorageKeys.Settings, JSON.stringify(settings));
    this.settings = { ...settings };
  }
}
