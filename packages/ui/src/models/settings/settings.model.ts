import { CAMEL_RUNTIMES, TEST_RUNTIMES } from '../catalog-runtime-types';

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

/**
 * Simplified catalog version configuration matching VS Code extension settings format.
 * Used for persisting catalog selection in settings.
 * Stores only version and runtime to match VS Code extension pattern:
 * - kaoto.camelCatalog.version: { version: "4.14.5", runtime: "Main" }
 * - kaoto.citrusCatalog.version: { version: "4.10.1", runtime: "Citrus" }
 */
export interface CatalogVersion {
  version: string; // e.g., "4.14.5"
  runtime: string; // e.g., "Main", "Quarkus", "Spring Boot", "Citrus"
}

export interface ISettingsModel {
  catalogUrl: string;
  camelCatalog: CatalogVersion;
  citrusCatalog: CatalogVersion;
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
  camelCatalog: CatalogVersion = { version: '4.18.0', runtime: CAMEL_RUNTIMES[0] };
  citrusCatalog: CatalogVersion = { version: '4.10.1', runtime: TEST_RUNTIMES[0] };
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
    const { rest, camelCatalog, citrusCatalog, ...topLevel } = options;

    // Assign top-level properties
    Object.assign(this, topLevel);

    // Deep merge nested objects to preserve defaults
    if (rest) {
      this.rest = { ...this.rest, ...rest };
    }

    if (camelCatalog) {
      this.camelCatalog = camelCatalog;
    }
    if (citrusCatalog) {
      this.citrusCatalog = citrusCatalog;
    }
  }
}
