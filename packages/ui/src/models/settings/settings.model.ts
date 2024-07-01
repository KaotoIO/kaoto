export interface ISettingsModel {
  catalogUrl: string;
  nodeLabel: string;
}

export interface AbstractSettingsAdapter {
  getSettings(): ISettingsModel;
  saveSettings(settings: ISettingsModel): void;
}

export class SettingsModel implements ISettingsModel {
  catalogUrl: string = '';
  nodeLabel: string = 'description';

  constructor(options: Partial<ISettingsModel> = {}) {
    Object.assign(this, options);
  }
}
