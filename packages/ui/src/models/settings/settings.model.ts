import {
  CanvasLayoutDirection,
  ColorScheme,
  ISettingsModel,
  NodeLabelType,
  NodeToolbarTrigger,
} from '@kaoto/editor-api';

export interface AbstractSettingsAdapter {
  getSettings(): ISettingsModel;
  saveSettings(settings: ISettingsModel): void;
}

export class SettingsModel implements ISettingsModel {
  catalogUrl: string = '';
  runtimeCatalogName: string = '';
  testingCatalogName: string = '';
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
