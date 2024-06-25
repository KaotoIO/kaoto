const DEFAULT_SETTINGS: SettingsModel = {
  catalogUrl: '',
};

export class SettingsModel {
  catalogUrl: string = '';

  constructor(options: Partial<SettingsModel> = {}) {
    Object.assign(this, DEFAULT_SETTINGS, options);
  }
}
