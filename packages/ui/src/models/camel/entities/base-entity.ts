/** This is the enum with the registered Camel entities supported by Kaoto */
export const enum EntityType {
  Route = 'route',
  OnException = 'onException',
  ErrorHandler = 'errorHandler',
  Integration = 'integration',
  Kamelet = 'kamelet',
  KameletBinding = 'kameletBinding',
  Pipe = 'pipe',
  Test = 'test',
  Rest = 'rest',
  RestConfiguration = 'restConfiguration',
  RouteConfiguration = 'routeConfiguration',
  Intercept = 'intercept',
  InterceptFrom = 'interceptFrom',
  InterceptSendToEndpoint = 'interceptSendToEndpoint',
  OnCompletion = 'onCompletion',
  Beans = 'beans',
  Metadata = 'metadata',
  PipeErrorHandler = 'pipeErrorHandler',
  NonVisualEntity = 'nonVisualEntity',
}

export interface BaseCamelEntity {
  /** Internal API fields */
  id: string;
  readonly type: EntityType;

  /** Retrieve the model from the underlying Camel entity */
  toJSON(): unknown;
}
