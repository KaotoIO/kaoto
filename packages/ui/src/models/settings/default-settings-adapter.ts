import { ROOT_PATH, setValue } from '../../utils';
import { AbstractSettingsAdapter } from './abstract-settings-adapter';
import { SettingsModel } from './settings.model';

export class DefaultSettingsAdapter extends AbstractSettingsAdapter {
  private readonly defaultSettings = new SettingsModel();

  getSettings() {
    return this.defaultSettings;
  }

  saveSettings(settings: SettingsModel) {
    setValue(this.defaultSettings, ROOT_PATH, settings);
  }
}
