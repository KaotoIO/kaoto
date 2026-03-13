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

export const enum CanvasLayoutDirection {
  SelectInCanvas = 'SelectInCanvas',
  Horizontal = 'Horizontal',
  Vertical = 'Vertical',
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
  canvasLayoutDirection: CanvasLayoutDirection;
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
  canvasLayoutDirection: CanvasLayoutDirection = CanvasLayoutDirection.SelectInCanvas;

  constructor(options: Partial<ISettingsModel> = {}) {
    // Extract nested objects before Object.assign
    const { rest, ...topLevel } = options;

    // Assign top-level properties
    Object.assign(this, topLevel);

    // Deep merge nested objects to preserve defaults
    if (rest) {
      this.rest = { ...this.rest, ...rest };
    }
  }
}
