const DEFAULT_SETTINGS: SettingsModel = {
  catalogUrl: '',
  nodeLabel: 'description',
};

export class SettingsModel {
  catalogUrl: string = '';
  nodeLabel: string = '';

  constructor(options: Partial<SettingsModel> = {}) {
    Object.assign(this, DEFAULT_SETTINGS, options);
  }
}
