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
