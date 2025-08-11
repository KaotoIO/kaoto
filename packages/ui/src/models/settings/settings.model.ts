export const enum NodeLabelType {
  Id = 'id',
  Description = 'description',
}

export const enum NodeToolbarTrigger {
  onHover = 'onHover',
  onSelection = 'onSelection',
}

export const enum ColorScheme {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

export interface ISettingsModel {
  catalogUrl: string;
  nodeLabel: NodeLabelType;
  nodeToolbarTrigger: NodeToolbarTrigger;
  colorScheme: ColorScheme;
  experimentalFeatures: {
    enableDragAndDrop: boolean;
  };
}

export interface AbstractSettingsAdapter {
  getSettings(): ISettingsModel;
  saveSettings(settings: ISettingsModel): void;
}

export class SettingsModel implements ISettingsModel {
  catalogUrl: string = '';
  nodeLabel: NodeLabelType = NodeLabelType.Description;
  nodeToolbarTrigger: NodeToolbarTrigger = NodeToolbarTrigger.onHover;
  colorScheme: ColorScheme = ColorScheme.Auto;
  experimentalFeatures = {
    enableDragAndDrop: true,
  };

  constructor(options: Partial<ISettingsModel> = {}) {
    Object.assign(this, options);
  }
}
