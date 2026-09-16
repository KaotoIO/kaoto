import { CatalogKind } from '../models/catalog-kind.js';
import { FileTypes, type FileTypesResponse } from '../models/file-types.js';
import type { RuntimeMavenInformation } from '../models/runtime-maven-information.js';
import {
  CanvasLayoutDirection,
  ColorScheme,
  type ISettingsModel,
  NodeLabelType,
  NodeToolbarTrigger,
} from '../models/settings/settings.model.js';
import { StepUpdateAction } from '../models/step-update-action.js';

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type Unsubscribe = () => void;

export interface RequestOptions {
  timeoutMs?: number | null;
  signal?: AbortSignal;
}

export interface RequestContext {
  signal: AbortSignal;
}

export interface IEventBus {
  emit<E extends keyof KaotoEvents>(event: E, payload: KaotoEvents[E]): void;
  on<E extends keyof KaotoEvents>(event: E, handler: (payload: KaotoEvents[E]) => void): Unsubscribe;
  request<R extends keyof KaotoRequests>(
    request: R,
    payload: KaotoRequests[R],
    options?: RequestOptions,
  ): Promise<KaotoResponses[R]>;
  onRequest<R extends keyof KaotoRequests>(
    request: R,
    handler: (payload: KaotoRequests[R], context: RequestContext) => KaotoResponses[R] | Promise<KaotoResponses[R]>,
  ): Unsubscribe;
  dispose(): void;
}

export type BridgeErrorCode =
  | 'NOT_CONNECTED'
  | 'NOT_READY'
  | 'UNSUPPORTED_REQUEST'
  | 'INVALID_MESSAGE'
  | 'INCOMPATIBLE_VERSION'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'DISPOSED'
  | 'IO_ERROR'
  | 'INTERNAL_ERROR';

export interface BridgeErrorData {
  code: BridgeErrorCode;
  message: string;
}

/** Local error representation. Only code and message may cross the transport. */
export class BridgeError extends Error implements BridgeErrorData {
  constructor(
    public readonly code: BridgeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export interface ContentSnapshot {
  content: string;
  revision: number;
}

export type SetContentRequest =
  | {
      reason: 'init';
      fileUri: string;
      content: string;
      isDirty: boolean | null;
      readonly: boolean;
      saveAcknowledgements: boolean;
      nativeUndoRedo?: boolean;
    }
  | {
      reason: 'hostUpdate' | 'revert';
      fileUri: string;
      content: string;
    }
  | {
      reason: 'saveEcho';
      fileUri: string;
      content: string;
      revision: number;
    };

export interface SettingsSnapshot {
  settings: ISettingsModel;
  settingsVersion: number;
}

export interface ValidationNotification {
  message: string;
  severity: 'error' | 'warning' | 'info';
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface FilePickerOptions {
  canPickMany?: boolean;
  placeHolder?: string;
  title?: string;
}

export interface SuggestionDto {
  value: string;
  description?: string;
  group?: string;
}

export type KaotoRequests = {
  'editor:document:setContent': SetContentRequest;
  'editor:document:getContent': null;
  'editor:document:validate': null;
  'editor:preview:get': null;
  'editor:undoRedo:apply': { command: 'undo' | 'redo' };
  'host:undoRedo:apply': { command: 'undo' | 'redo'; revision: number };
  'editor:settings:get': null;
  'editor:metadata:get': { key: string };
  'editor:metadata:set': { key: string; value: JsonValue };
  'editor:resource:getContent': { path: string };
  'editor:resource:save': { path: string; content: string };
  'editor:resource:exists': { path: string };
  'editor:resource:delete': { path: string };
  'editor:resource:getByType': { fileType: 'kamelets' };
  'host:ui:pickFile': { include: string; exclude?: string; options?: FilePickerOptions };
  'editor:suggestions:get': { topic: string; word: string; context: JsonObject };
  'editor:maven:getRuntimeInfo': null;
};

export type KaotoResponses = {
  'editor:document:setContent': { applied: boolean; revision: number };
  'editor:document:getContent': ContentSnapshot;
  'editor:document:validate': { notifications: ValidationNotification[] };
  'editor:preview:get': { svg: string | null };
  'editor:undoRedo:apply': null;
  'host:undoRedo:apply': null;
  'editor:settings:get': SettingsSnapshot;
  'editor:metadata:get': { value: JsonValue };
  'editor:metadata:set': null;
  'editor:resource:getContent': { content: string | null };
  'editor:resource:save': null;
  'editor:resource:exists': { exists: boolean };
  'editor:resource:delete': { success: boolean };
  'editor:resource:getByType': { resources: FileTypesResponse[] };
  'host:ui:pickFile': { selection: string[] | string | null };
  'editor:suggestions:get': { suggestions: SuggestionDto[] };
  'editor:maven:getRuntimeInfo': { runtimeInfo: RuntimeMavenInformation | null };
};

export type KaotoEvents = {
  'editor:ready': null;
  'editor:document:changed': ContentSnapshot;
  'host:document:saved': { revision: number; isDirty: boolean };
  'host:document:dirtyChanged': { isDirty: boolean; revision: number };
  'editor:document:saveRequested': null;
  'editor:settings:updated': SettingsSnapshot;
  'host:theme:changed': { theme: 'light' | 'dark' | 'high-contrast' | 'high-contrast-light' };
  'editor:notifications:set': { path: string; notifications: ValidationNotification[] };
  'editor:step:updated': { action: StepUpdateAction; stepType: CatalogKind; stepName: string };
  'host:notification:show': { message: string; type: 'info' | 'warning' | 'error' };
};

/** Validate before serialization so JSON conversion cannot silently discard data. */
export function isJsonValue(value: unknown): value is JsonValue {
  const ancestors = new Set<object>();
  const visit = (current: unknown): boolean => {
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return true;
    if (typeof current === 'number') return Number.isFinite(current);
    if (typeof current !== 'object' || ancestors.has(current)) return false;
    const prototype = Object.getPrototypeOf(current);
    const array = Array.isArray(current);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return false;
    const keys = Reflect.ownKeys(current).filter((key) => !array || key !== 'length');
    if (array && keys.length !== current.length) return false;
    ancestors.add(current);
    const valid = keys.every((key, index) => {
      if (typeof key !== 'string' || (array && key !== String(index))) return false;
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      return !!descriptor?.enumerable && 'value' in descriptor && visit(descriptor.value);
    });
    ancestors.delete(current);
    return valid;
  };
  try {
    return visit(value);
  } catch {
    // Uninspectable objects and excessively deep input cannot cross the boundary.
    return false;
  }
}

type Validator<T> = (value: unknown) => value is T;
const string: Validator<string> = (value): value is string => typeof value === 'string';
const boolean: Validator<boolean> = (value): value is boolean => typeof value === 'boolean';
const nil: Validator<null> = (value): value is null => value === null;
const integer: Validator<number> = (value): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const jsonObject: Validator<JsonObject> = (value): value is JsonObject => record(value) && isJsonValue(value);

function oneOf<const T extends string>(...values: T[]): Validator<T> {
  return (value): value is T => values.some((candidate) => candidate === value);
}
function optional<T>(validate: Validator<T>): Validator<T | undefined> {
  return (value): value is T | undefined => value === undefined || validate(value);
}
function nullable<T>(validate: Validator<T>): Validator<T | null> {
  return (value): value is T | null => value === null || validate(value);
}
function arrayOf<T>(validate: Validator<T>): Validator<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(validate);
}
function object<T>(fields: { [K in keyof T]-?: Validator<T[K]> }): Validator<T> {
  return (value): value is T =>
    record(value) &&
    Object.entries<Validator<unknown>>(fields).every(([key, validate]) =>
      validate(Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined),
    );
}
function json<T>(validate: Validator<T>): Validator<T> {
  return (value): value is T => isJsonValue(value) && validate(value);
}

const contentSnapshot = object<ContentSnapshot>({ content: string, revision: integer });
const initialContent = object<Extract<SetContentRequest, { reason: 'init' }>>({
  reason: oneOf('init'),
  fileUri: string,
  content: string,
  isDirty: nullable(boolean),
  readonly: boolean,
  saveAcknowledgements: boolean,
  nativeUndoRedo: optional(boolean),
});
const hostContent = object<Extract<SetContentRequest, { reason: 'hostUpdate' | 'revert' }>>({
  reason: oneOf('hostUpdate', 'revert'),
  fileUri: string,
  content: string,
});
const savedContent = object<Extract<SetContentRequest, { reason: 'saveEcho' }>>({
  reason: oneOf('saveEcho'),
  fileUri: string,
  content: string,
  revision: integer,
});
const setContent: Validator<SetContentRequest> = (value): value is SetContentRequest =>
  (initialContent(value) && (!value.saveAcknowledgements || typeof value.isDirty === 'boolean')) ||
  hostContent(value) ||
  savedContent(value);

const settingsSnapshot = object<SettingsSnapshot>({
  settingsVersion: integer,
  settings: object<ISettingsModel>({
    catalogUrl: string,
    runtimeCatalogName: string,
    testingCatalogName: string,
    nodeLabel: oneOf(NodeLabelType.Id, NodeLabelType.Description),
    nodeToolbarTrigger: oneOf(NodeToolbarTrigger.onHover, NodeToolbarTrigger.onSelection),
    colorScheme: oneOf(ColorScheme.Auto, ColorScheme.Light, ColorScheme.Dark),
    rest: object({ apicurioRegistryUrl: string, customMediaTypes: arrayOf(string) }),
    canvasLayoutDirection: oneOf(
      CanvasLayoutDirection.SelectInCanvas,
      CanvasLayoutDirection.Horizontal,
      CanvasLayoutDirection.Vertical,
    ),
  }),
});
const severity = oneOf('error', 'warning', 'info');
const position = object({ line: integer, character: integer });
const range = object({ start: position, end: position });
const orderedRange: Validator<NonNullable<ValidationNotification['range']>> = (
  value,
): value is NonNullable<ValidationNotification['range']> =>
  range(value) &&
  (value.start.line < value.end.line ||
    (value.start.line === value.end.line && value.start.character <= value.end.character));
const notifications = arrayOf(
  object<ValidationNotification>({ message: string, severity, range: optional(orderedRange) }),
);
const pickerOptions = object<FilePickerOptions>({
  canPickMany: optional(boolean),
  placeHolder: optional(string),
  title: optional(string),
});
const selection: Validator<string | string[] | null> = (value): value is string | string[] | null =>
  value === null || string(value) || arrayOf(string)(value);
const runtimeInfo: Validator<RuntimeMavenInformation> = object({
  runtime: string,
  camelVersion: string,
  camelSpringBootBomArtifactId: optional(string),
  camelSpringBootBomGroupId: optional(string),
  camelSpringBootVersion: optional(string),
  springBootVersion: optional(string),
  camelQuarkusVersion: optional(string),
  quarkusVersion: optional(string),
  quarkusBomGroupId: optional(string),
  quarkusBomArtifactId: optional(string),
  camelQuarkusBomGroupId: optional(string),
  camelQuarkusBomArtifactId: optional(string),
});

interface RequestDefinition<Request, Response> {
  readonly sender: 'host' | 'editor';
  readonly timeoutMs: number | null;
  readonly isRequest: Validator<Request>;
  readonly isResponse: Validator<Response>;
}
function request<Request, Response>(
  sender: 'host' | 'editor',
  isRequest: Validator<Request>,
  isResponse: Validator<Response>,
  timeoutMs: number | null = 5000,
): RequestDefinition<Request, Response> {
  return { sender, timeoutMs, isRequest: json(isRequest), isResponse: json(isResponse) };
}

/** Names describe the subject, so callers must use the declared sender, not the prefix. */
export const requestCatalog: {
  readonly [R in keyof KaotoRequests]: RequestDefinition<KaotoRequests[R], KaotoResponses[R]>;
} = {
  'editor:document:setContent': request('host', setContent, object({ applied: boolean, revision: integer })),
  'editor:document:getContent': request('host', nil, contentSnapshot),
  'editor:document:validate': request('host', nil, object({ notifications })),
  'editor:preview:get': request('host', nil, object({ svg: nullable(string) })),
  'editor:undoRedo:apply': request('host', object({ command: oneOf('undo', 'redo') }), nil),
  'host:undoRedo:apply': request('editor', object({ command: oneOf('undo', 'redo'), revision: integer }), nil),
  'editor:settings:get': request('editor', nil, settingsSnapshot),
  'editor:metadata:get': request('editor', object({ key: string }), object({ value: isJsonValue })),
  'editor:metadata:set': request('editor', object({ key: string, value: isJsonValue }), nil),
  'editor:resource:getContent': request('editor', object({ path: string }), object({ content: nullable(string) })),
  'editor:resource:save': request('editor', object({ path: string, content: string }), nil),
  'editor:resource:exists': request('editor', object({ path: string }), object({ exists: boolean })),
  'editor:resource:delete': request('editor', object({ path: string }), object({ success: boolean })),
  'editor:resource:getByType': request(
    'editor',
    object({ fileType: oneOf(FileTypes.Kamelets) }),
    object({ resources: arrayOf(object<FileTypesResponse>({ filename: string, content: string })) }),
  ),
  'host:ui:pickFile': request(
    'editor',
    object({ include: string, exclude: optional(string), options: optional(pickerOptions) }),
    object({ selection }),
    null,
  ),
  'editor:suggestions:get': request(
    'editor',
    object({ topic: string, word: string, context: jsonObject }),
    object({
      suggestions: arrayOf(
        object<SuggestionDto>({ value: string, description: optional(string), group: optional(string) }),
      ),
    }),
    2000,
  ),
  'editor:maven:getRuntimeInfo': request('editor', nil, object({ runtimeInfo: nullable(runtimeInfo) }), 60000),
};

interface EventDefinition<Payload> {
  readonly sender: 'host' | 'editor';
  readonly isPayload: Validator<Payload>;
}
function event<Payload>(sender: 'host' | 'editor', isPayload: Validator<Payload>): EventDefinition<Payload> {
  return { sender, isPayload: json(isPayload) };
}
const catalogKind = oneOf(
  CatalogKind.Component,
  CatalogKind.Processor,
  CatalogKind.Pattern,
  CatalogKind.Entity,
  CatalogKind.Language,
  CatalogKind.Dataformat,
  CatalogKind.Loadbalancer,
  CatalogKind.Kamelet,
  CatalogKind.Function,
  CatalogKind.TestActionGroup,
  CatalogKind.TestAction,
  CatalogKind.TestContainer,
  CatalogKind.TestEndpoint,
  CatalogKind.TestFunction,
  CatalogKind.TestValidationMatcher,
);
const dirtyState = object({ revision: integer, isDirty: boolean });
export const eventCatalog: { readonly [E in keyof KaotoEvents]: EventDefinition<KaotoEvents[E]> } = {
  'editor:ready': event('editor', nil),
  'editor:document:changed': event('editor', contentSnapshot),
  'host:document:saved': event('host', dirtyState),
  'host:document:dirtyChanged': event('host', dirtyState),
  'editor:document:saveRequested': event('editor', nil),
  'editor:settings:updated': event('host', settingsSnapshot),
  'host:theme:changed': event(
    'host',
    object({ theme: oneOf('light', 'dark', 'high-contrast', 'high-contrast-light') }),
  ),
  'editor:notifications:set': event('editor', object({ path: string, notifications })),
  'editor:step:updated': event(
    'editor',
    object({
      action: oneOf(StepUpdateAction.Add, StepUpdateAction.Replace, StepUpdateAction.Remove),
      stepType: catalogKind,
      stepName: string,
    }),
  ),
  'host:notification:show': event('editor', object({ message: string, type: severity })),
};

export function isEventName(name: unknown): name is keyof KaotoEvents {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(eventCatalog, name);
}
export function isRequestName(name: unknown): name is keyof KaotoRequests {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(requestCatalog, name);
}

export interface WireHeader {
  protocol: 'kaoto-host-bridge';
  version: 1;
  sessionId: string;
}

export type WireMessage = WireHeader &
  (
    | { kind: 'event'; name: string; payload: JsonValue }
    | { kind: 'request'; id: string; name: string; payload: JsonValue }
    | { kind: 'response'; id: string; name: string; ok: true; payload: JsonValue }
    | { kind: 'response'; id: string; name: string; ok: false; error: BridgeErrorData }
    | { kind: 'cancel'; id: string }
  );

export type ControlMessage = {
  protocol: 'kaoto-host-bridge';
  version: 1;
} & (
  | { kind: 'hello'; editorBootId: string }
  | { kind: 'welcome'; editorBootId: string; sessionId: string }
  | { kind: 'rejected'; editorBootId: string; error: BridgeErrorData }
);

export interface MessageTransport {
  send(message: WireMessage | ControlMessage): void | Promise<void>;
  onMessage(handler: (message: unknown) => void): Unsubscribe;
  dispose(): void;
}

const nonEmptyString: Validator<string> = (value): value is string => string(value) && value.length > 0;
const errorData = object<BridgeErrorData>({
  code: oneOf(
    'NOT_CONNECTED',
    'NOT_READY',
    'UNSUPPORTED_REQUEST',
    'INVALID_MESSAGE',
    'INCOMPATIBLE_VERSION',
    'TIMEOUT',
    'CANCELLED',
    'DISPOSED',
    'IO_ERROR',
    'INTERNAL_ERROR',
  ),
  message: string,
});
export const isBridgeErrorData = json(errorData);

export function isControlMessage(value: unknown): value is ControlMessage {
  if (
    !isJsonValue(value) ||
    !record(value) ||
    value.protocol !== 'kaoto-host-bridge' ||
    value.version !== 1 ||
    !nonEmptyString(value.editorBootId)
  )
    return false;
  switch (value.kind) {
    case 'hello':
      return true;
    case 'welcome':
      return nonEmptyString(value.sessionId);
    case 'rejected':
      return errorData(value.error);
    default:
      return false;
  }
}

export function isWireMessage(value: unknown): value is WireMessage {
  if (
    !isJsonValue(value) ||
    !record(value) ||
    value.protocol !== 'kaoto-host-bridge' ||
    value.version !== 1 ||
    !nonEmptyString(value.sessionId)
  )
    return false;
  if (value.kind === 'cancel') return nonEmptyString(value.id);
  if (!nonEmptyString(value.name)) return false;
  if (value.kind === 'event') return isJsonValue(value.payload);
  if (!nonEmptyString(value.id)) return false;
  if (value.kind === 'request') return isJsonValue(value.payload);
  if (value.kind !== 'response') return false;
  return value.ok === true ? isJsonValue(value.payload) : value.ok === false && errorData(value.error);
}
