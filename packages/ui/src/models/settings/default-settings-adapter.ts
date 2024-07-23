import { AbstractSettingsAdapter, ISettingsModel, SettingsModel } from './settings.model';

export class DefaultSettingsAdapter implements AbstractSettingsAdapter {
  private settings: ISettingsModel;

  constructor(settings?: Partial<ISettingsModel>) {
    this.settings = new SettingsModel(settings);
  }

  getSettings() {
    return this.settings;
  }

  saveSettings(settings: ISettingsModel) {
    Object.assign(this.settings, settings);
  }
}
