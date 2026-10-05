// value exports (enums, classes, functions)
export {
  BridgeError,
  CanvasLayoutDirection,
  CatalogKind,
  ColorScheme,
  FileTypes,
  isJsonValue,
  NodeLabelType,
  NodeToolbarTrigger,
  StepUpdateAction,
} from './contracts.js';

// Domain types not re-exported via contracts
export type {
  CamelMainMavenInformation,
  CamelQuarkusMavenInformation,
  CamelSpringBootMavenInformation,
  Suggestion,
  SuggestionRequestContext,
} from './domain.js';

// type-only exports (interfaces, type aliases)
export {
  type BridgeConnection,
  type BridgeOptions,
  createIframeTransport,
  createMemoryTransports,
  createPostMessageBridge,
  type IframeTransportOptions,
} from './bridge.js';
export type {
  BridgeErrorCode,
  BridgeErrorData,
  ContentSnapshot,
  ControlMessage,
  FilePickerOptions,
  FileTypesResponse,
  IEventBus,
  ISettingsModel,
  JsonObject,
  JsonValue,
  KaotoEvents,
  KaotoRequests,
  KaotoResponses,
  MessageTransport,
  RequestContext,
  RequestOptions,
  RuntimeMavenInformation,
  SetContentRequest,
  SettingsSnapshot,
  SuggestionDto,
  Unsubscribe,
  ValidationNotification,
  WireHeader,
  WireMessage,
} from './contracts.js';
export { createEventBus, type EndpointRole, type EventBusOptions } from './event-bus.js';
