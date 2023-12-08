/** This is the enum with the registered Camel entities supported by Kaoto */
export const enum EntityType {
  Route = 'route',
  Integration = 'integration',
  Kamelet = 'kamelet',
  KameletBinding = 'kameletBinding',
  Pipe = 'pipe',
  Rest = 'rest',
  RestConfiguration = 'restConfiguration',
  Beans = 'beans',
  Metadata = 'metadata',
  ErrorHandler = 'errorHandler',
  NonVisualEntity = 'nonVisualEntity',
}

export interface BaseCamelEntity {
  /** Internal API fields */
  id: string;
  readonly type: EntityType;

  /** Retrieve the model from the underlying Camel entity */
  toJSON(): unknown;
}
