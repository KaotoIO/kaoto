import { LocalStorageKeys } from '../local-storage-keys';
import { AbstractSettingsAdapter } from './abstract-settings-adapter';
import { SettingsModel } from './settings.model';

export class LocalStorageSettingsAdapter extends AbstractSettingsAdapter {
  private readonly settings: SettingsModel;

  constructor() {
    super();

    const rawSettings = localStorage.getItem(LocalStorageKeys.Settings) ?? '{}';
    const parsedSettings = JSON.parse(rawSettings);
    this.settings = new SettingsModel(parsedSettings);
  }

  getSettings(): SettingsModel {
    return this.settings;
  }

  saveSettings(settings: SettingsModel): void {
    localStorage.setItem(LocalStorageKeys.Settings, JSON.stringify(settings));
  }
}
