export interface ISettingsModel {
  catalogUrl: string;
}

export interface AbstractSettingsAdapter {
  getSettings(): ISettingsModel;
  saveSettings(settings: ISettingsModel): void;
}

export class SettingsModel implements ISettingsModel {
  catalogUrl: string = '';

  constructor(options: Partial<ISettingsModel> = {}) {
    Object.assign(this, options);
  }
}
