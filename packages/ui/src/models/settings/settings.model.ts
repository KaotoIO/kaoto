export const enum NodeLabelType {
  Id = 'id',
  Description = 'description',
}

export interface ISettingsModel {
  catalogUrl: string;
  nodeLabel: NodeLabelType;
}

export interface AbstractSettingsAdapter {
  getSettings(): ISettingsModel;
  saveSettings(settings: ISettingsModel): void;
}

export class SettingsModel implements ISettingsModel {
  catalogUrl: string = '';
  nodeLabel: NodeLabelType = NodeLabelType.Description;

  constructor(options: Partial<ISettingsModel> = {}) {
    Object.assign(this, options);
  }
}
