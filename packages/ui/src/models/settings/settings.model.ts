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
  rest: {
    apicurioRegistryUrl: string;
    customMediaTypes: string[];
  };
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
  rest = {
    apicurioRegistryUrl: '',
    customMediaTypes: [] as string[],
  };
  experimentalFeatures = {
    enableDragAndDrop: true,
  };

  constructor(options: Partial<ISettingsModel> = {}) {
    // Extract nested objects before Object.assign
    const { rest, experimentalFeatures, ...topLevel } = options;

    // Assign top-level properties
    Object.assign(this, topLevel);

    // Deep merge nested objects to preserve defaults
    if (rest) {
      this.rest = { ...this.rest, ...rest };
    }
    if (experimentalFeatures) {
      this.experimentalFeatures = { ...this.experimentalFeatures, ...experimentalFeatures };
    }
  }
}
