// value exports (enums, classes)
export {
  BridgeError,
  CanvasLayoutDirection,
  CatalogKind,
  ColorScheme,
  FileTypes,
  NodeLabelType,
  NodeToolbarTrigger,
  StepUpdateAction,
} from './contracts.js';

// type-only exports (interfaces, type aliases)
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

export {
  type BridgeConnection,
  type BridgeOptions,
  createIframeTransport,
  createMemoryTransports,
  createPostMessageBridge,
  type IframeTransportOptions,
} from './bridge.js';
