import { VisualizationNode } from '../visualization';

/** This is the enum with the registered Camel entities supported by Kaoto */
export const enum EntityType {
  Route = 'route',
  Integration = 'integration',
  Kamelet = 'kamelet',
  KameletBinding = 'kameletBinding',
  Pipe = 'pipe',
  Rest = 'rest',
  RestConfiguration = 'restConfiguration',
}

export interface BaseCamelEntity {
  /** Internal API fields */
  readonly id: string;
  readonly type: EntityType;
}

export interface BaseVisualCamelEntity extends BaseCamelEntity {
  id: string;
  type: EntityType;

  getId: () => string;
  getSteps: () => unknown[];
  toVizNode: () => VisualizationNode;
}
