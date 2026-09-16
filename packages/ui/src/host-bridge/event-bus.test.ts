import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { CatalogKind } from '../models/catalog-kind.js';
import { SettingsModel } from '../models/settings/settings.model.js';
import { StepUpdateAction } from '../models/step-update-action.js';
import {
  eventCatalog,
  type IEventBus,
  isJsonValue,
  type KaotoEvents,
  type KaotoRequests,
  type KaotoResponses,
  requestCatalog,
} from './contracts.js';
import { createEventBus } from './event-bus.js';

describe('local host bridge endpoint', () => {
  it('continues dispatch when a thrown value cannot be converted to a string', () => {
    const onError = vi.fn();
    const bus = createEventBus({ role: 'editor', onError });
    const listener = vi.fn();
    bus.on('editor:ready', () => {
      throw Object.create(null);
    });
    bus.on('editor:ready', listener);
    expect(() => {
      bus.emit('editor:ready', null);
    }).not.toThrow();
    expect(listener).toHaveBeenCalledExactlyOnceWith(null);
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'INTERNAL_ERROR' }));
    bus.dispose();
  });

  it('rejects an unconnected peer request', async () => {
    const bus = createEventBus({ role: 'host', onError: vi.fn() });
    await expect(bus.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    bus.dispose();
  });

  it('continues local dispatch after a subscriber throws', () => {
    const onError = vi.fn();
    const bus = createEventBus({ role: 'editor', onError });
    const failure = new Error('listener failure');
    const next = vi.fn();
    bus.on('editor:ready', () => {
      throw failure;
    });
    bus.on('editor:ready', next);
    bus.emit('editor:ready', null);
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(next).toHaveBeenCalledExactlyOnceWith(null);
    bus.dispose();
  });

  it('dispatches synchronously in registration order using a subscription snapshot', () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    const calls: string[] = [];
    const third = () => calls.push('third');
    bus.on('editor:ready', () => {
      calls.push('first');
      unsubscribeSecond();
      bus.on('editor:ready', third);
    });
    const unsubscribeSecond = bus.on('editor:ready', () => calls.push('second'));
    bus.emit('editor:ready', null);
    expect(calls).toEqual(['first', 'second']);
    calls.length = 0;
    bus.emit('editor:ready', null);
    expect(calls).toEqual(['first', 'third']);
    bus.dispose();
  });

  it('unsubscribes each registration independently and idempotently', () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    const listener = vi.fn();
    const unsubscribe = bus.on('editor:ready', listener);
    bus.on('editor:ready', listener);
    unsubscribe();
    unsubscribe();
    bus.emit('editor:ready', null);
    expect(listener).toHaveBeenCalledExactlyOnceWith(null);
    bus.dispose();
  });

  it('keeps endpoints and event names isolated', () => {
    const first = createEventBus({ role: 'editor', onError: vi.fn() });
    const second = createEventBus({ role: 'editor', onError: vi.fn() });
    const otherEndpoint = vi.fn();
    const otherEvent = vi.fn();
    second.on('editor:ready', otherEndpoint);
    first.on('editor:document:saveRequested', otherEvent);
    first.emit('editor:ready', null);
    expect(otherEndpoint).not.toHaveBeenCalled();
    expect(otherEvent).not.toHaveBeenCalled();
    first.dispose();
    second.dispose();
  });

  it('does not let an old unsubscribe remove a newer subscription list', () => {
    const bus = createEventBus({ role: 'editor', onError: vi.fn() });
    const unsubscribe = bus.on('editor:ready', vi.fn());
    unsubscribe();
    const listener = vi.fn();
    bus.on('editor:ready', listener);
    unsubscribe();
    bus.emit('editor:ready', null);
    expect(listener).toHaveBeenCalledExactlyOnceWith(null);
    bus.dispose();
  });

  it('allows one peer request handler per name and releases it on unsubscribe', async () => {
    const bus = createEventBus({ role: 'host', onError: vi.fn() });
    const handler = vi.fn(() => ({ value: null }));
    const unsubscribe = bus.onRequest('editor:metadata:get', handler);
    expect(() => bus.onRequest('editor:metadata:get', handler)).toThrow();
    unsubscribe();
    bus.onRequest('editor:metadata:get', handler);
    unsubscribe();
    expect(() => bus.onRequest('editor:metadata:get', handler)).toThrow();
    await expect(bus.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    expect(handler).not.toHaveBeenCalled();
    bus.dispose();
  });

  it('rejects use after disposal while cleanup remains idempotent', async () => {
    const bus = createEventBus({ role: 'host', onError: vi.fn() });
    const unsubscribe = bus.on('editor:ready', vi.fn());
    const unregister = bus.onRequest('editor:metadata:set', () => null);
    bus.dispose();
    expect(() => {
      bus.emit('host:theme:changed', { theme: 'dark' });
    }).toThrow(expect.objectContaining({ code: 'DISPOSED' }));
    expect(() => bus.on('editor:ready', vi.fn())).toThrow(expect.objectContaining({ code: 'DISPOSED' }));
    expect(() => bus.onRequest('editor:metadata:set', () => null)).toThrow(
      expect.objectContaining({ code: 'DISPOSED' }),
    );
    await expect(bus.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'DISPOSED' });
    expect(() => {
      unsubscribe();
      unregister();
      bus.dispose();
    }).not.toThrow();
  });

  it('rejects unknown names, wrong directions and malformed payloads before local delivery', async () => {
    const host = createEventBus({ role: 'host', onError: vi.fn() });
    const editor = createEventBus({ role: 'editor', onError: vi.fn() });
    const listener = vi.fn();
    host.on('editor:ready', listener);
    host.on('host:document:saved', listener);
    const invalid = expect.objectContaining({ code: 'INVALID_MESSAGE' });
    expect(() => {
      host.emit('editor:ready', null);
    }).toThrow(invalid);
    expect(() => {
      host.emit('host:document:saved', { revision: -1, isDirty: false });
    }).toThrow(invalid);
    for (const name of ['unknown', 'toString', '__proto__']) {
      expect(() => {
        editor.emit(name as keyof KaotoEvents, null);
      }).toThrow(invalid);
      expect(() => editor.on(name as keyof KaotoEvents, listener)).toThrow(invalid);
      expect(() => host.onRequest(name as keyof KaotoRequests, () => null)).toThrow(invalid);
      await expect(host.request(name as keyof KaotoRequests, null)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    }
    expect(() => host.onRequest('editor:document:getContent', () => ({ content: '', revision: 0 }))).toThrow(invalid);
    await expect(host.request('editor:metadata:get', { key: 'filePath' })).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
    await expect(editor.request('editor:resource:getByType', { fileType: 'routes' } as never)).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
    expect(listener).not.toHaveBeenCalled();
    host.dispose();
    editor.dispose();
  });
});

const settings = { settings: { ...new SettingsModel() }, settingsVersion: 0 };
const notification = {
  message: 'Missing URI',
  severity: 'error' as const,
  range: {
    start: { line: 0, character: 2 },
    end: { line: 1, character: 0 },
  },
};

const requestExamples = {
  'editor:document:setContent': {
    sender: 'host',
    timeoutMs: 5000,
    payload: {
      reason: 'init',
      fileUri: 'file:///route.camel.yaml',
      content: '',
      isDirty: false,
      readonly: false,
      saveAcknowledgements: true,
    },
    response: { applied: true, revision: 0 },
    invalidRequest: { reason: 'init', fileUri: 'file:///route.camel.yaml', content: '' },
    invalidResponse: { applied: true, revision: -1 },
  },
  'editor:document:getContent': {
    sender: 'host',
    timeoutMs: 5000,
    payload: null,
    response: { content: '', revision: 1 },
    invalidRequest: {},
    invalidResponse: { content: '', revision: 1.5 },
  },
  'editor:document:validate': {
    sender: 'host',
    timeoutMs: 5000,
    payload: null,
    response: { notifications: [notification] },
    invalidRequest: false,
    invalidResponse: { notifications: [{ message: 'bad', severity: 'fatal' }] },
  },
  'editor:preview:get': {
    sender: 'host',
    timeoutMs: 5000,
    payload: null,
    response: { svg: null },
    invalidRequest: '',
    invalidResponse: { svg: undefined },
  },
  'editor:undoRedo:apply': {
    sender: 'host',
    timeoutMs: 5000,
    payload: { command: 'undo' },
    response: null,
    invalidRequest: { command: 'reset' },
    invalidResponse: {},
  },
  'host:undoRedo:apply': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { command: 'undo', revision: 1 },
    response: null,
    invalidRequest: { command: 'undo', revision: -1 },
    invalidResponse: {},
  },
  'editor:settings:get': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: null,
    response: settings,
    invalidRequest: [],
    invalidResponse: { settings: new SettingsModel(), settingsVersion: 0 },
  },
  'editor:metadata:get': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { key: 'filePath' },
    response: { value: { nested: [null, true, 1, 'value'] } },
    invalidRequest: { key: 1 },
    invalidResponse: { value: undefined },
  },
  'editor:metadata:set': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { key: 'filePath', value: null },
    response: null,
    invalidRequest: { key: 'filePath', value: () => '' },
    invalidResponse: true,
  },
  'editor:resource:getContent': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { path: 'schema.xsd' },
    response: { content: null },
    invalidRequest: { path: null },
    invalidResponse: { content: 0 },
  },
  'editor:resource:save': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { path: 'schema.xsd', content: '<schema />' },
    response: null,
    invalidRequest: { path: 'schema.xsd' },
    invalidResponse: undefined,
  },
  'editor:resource:exists': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { path: 'schema.xsd' },
    response: { exists: false },
    invalidRequest: {},
    invalidResponse: { exists: 'false' },
  },
  'editor:resource:delete': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { path: 'schema.xsd' },
    response: { success: true },
    invalidRequest: { path: [] },
    invalidResponse: { success: null },
  },
  'editor:resource:getByType': {
    sender: 'editor',
    timeoutMs: 5000,
    payload: { fileType: 'kamelets' },
    response: { resources: [{ filename: 'source.kamelet.yaml', content: '' }] },
    invalidRequest: { fileType: 'routes' },
    invalidResponse: { resources: [{ path: 'source.kamelet.yaml', content: '' }] },
  },
  'host:ui:pickFile': {
    sender: 'editor',
    timeoutMs: null,
    payload: {
      include: '**/*.xsd',
      exclude: '**/target/**',
      options: { canPickMany: true, placeHolder: 'Schema', title: 'Choose schema' },
    },
    response: { selection: ['schema.xsd'] },
    invalidRequest: { include: '**/*', options: { canPickMany: 'true' } },
    invalidResponse: { selection: [0] },
  },
  'editor:suggestions:get': {
    sender: 'editor',
    timeoutMs: 2000,
    payload: { topic: 'bean', word: 'my', context: { nested: { values: [null, 1] } } },
    response: { suggestions: [{ value: 'myBean', description: 'Bean', group: 'beans' }] },
    invalidRequest: { topic: 'bean', word: 'my', context: [] },
    invalidResponse: { suggestions: [{ value: 1 }] },
  },
  'editor:maven:getRuntimeInfo': {
    sender: 'editor',
    timeoutMs: 60000,
    payload: null,
    response: { runtimeInfo: { runtime: 'quarkus', camelVersion: '4.10.0', camelQuarkusVersion: '3.20.0' } },
    invalidRequest: {},
    invalidResponse: { runtimeInfo: { runtime: 'quarkus' } },
  },
} satisfies {
  [R in keyof KaotoRequests]: {
    sender: 'host' | 'editor';
    timeoutMs: number | null;
    payload: KaotoRequests[R];
    response: KaotoResponses[R];
    invalidRequest: unknown;
    invalidResponse: unknown;
  };
};

const eventExamples = {
  'editor:ready': { sender: 'editor', payload: null, invalid: {} },
  'editor:document:changed': {
    sender: 'editor',
    payload: { content: '', revision: 0 },
    invalid: { content: '', revision: -1 },
  },
  'host:document:saved': { sender: 'host', payload: { revision: 1, isDirty: false }, invalid: { revision: 1 } },
  'host:document:dirtyChanged': {
    sender: 'host',
    payload: { revision: 2, isDirty: true },
    invalid: { isDirty: 'true', revision: 2 },
  },
  'editor:document:saveRequested': { sender: 'editor', payload: null, invalid: false },
  'editor:settings:updated': { sender: 'host', payload: settings, invalid: { ...settings, settingsVersion: -1 } },
  'host:theme:changed': { sender: 'host', payload: { theme: 'high-contrast-light' }, invalid: { theme: 'auto' } },
  'editor:notifications:set': {
    sender: 'editor',
    payload: { path: 'route.camel.yaml', notifications: [notification] },
    invalid: { path: 'route.camel.yaml', notifications: [{ message: 'bad' }] },
  },
  'editor:step:updated': {
    sender: 'editor',
    payload: { action: StepUpdateAction.Add, stepType: CatalogKind.Component, stepName: 'timer' },
    invalid: { action: 'update', stepType: 'component', stepName: 'timer' },
  },
  'host:notification:show': {
    sender: 'editor',
    payload: { message: 'Saved', type: 'info' },
    invalid: { message: 'Saved', type: 'success' },
  },
} satisfies { [E in keyof KaotoEvents]: { sender: 'host' | 'editor'; payload: KaotoEvents[E]; invalid: unknown } };

describe('bridge catalog validation', () => {
  it.each(Object.entries(requestExamples))('enforces caller and handler roles for %s', async (name, example) => {
    const request = name as keyof KaotoRequests;
    const caller = createEventBus({ role: example.sender, onError: vi.fn() });
    const peer = createEventBus({ role: example.sender === 'host' ? 'editor' : 'host', onError: vi.fn() });
    const handler = vi.fn(() => example.response);
    peer.onRequest(request, handler);
    expect(() => caller.onRequest(request, handler)).toThrow(expect.objectContaining({ code: 'INVALID_MESSAGE' }));
    await expect(caller.request(request, example.payload)).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    await expect(peer.request(request, example.payload)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    expect(handler).not.toHaveBeenCalled();
    caller.dispose();
    peer.dispose();
  });

  it.each(Object.entries(requestExamples))('validates the request and response for %s', (name, example) => {
    const entry = requestCatalog[name as keyof KaotoRequests];
    expect(entry.sender).toBe(example.sender);
    expect(entry.timeoutMs).toBe(example.timeoutMs);
    expect(entry.isRequest(example.payload)).toBe(true);
    expect(entry.isResponse(example.response)).toBe(true);
    expect(entry.isRequest(example.invalidRequest)).toBe(false);
    expect(entry.isResponse(example.invalidResponse)).toBe(false);
  });

  it.each(Object.entries(eventExamples))('validates payload and sender for %s', (name, example) => {
    const event = name as keyof KaotoEvents;
    expect(eventCatalog[event].isPayload(example.payload)).toBe(true);
    expect(eventCatalog[event].isPayload(example.invalid)).toBe(false);
    const sender = createEventBus({ role: example.sender, onError: vi.fn() });
    const peer = createEventBus({ role: example.sender === 'host' ? 'editor' : 'host', onError: vi.fn() });
    const listener = vi.fn();
    sender.on(event, listener);
    sender.emit(event, example.payload);
    expect(listener).toHaveBeenCalledExactlyOnceWith(example.payload);
    expect(() => {
      peer.emit(event, example.payload);
    }).toThrow(expect.objectContaining({ code: 'INVALID_MESSAGE' }));
    sender.dispose();
    peer.dispose();
  });

  it.each(['hostUpdate', 'revert', 'saveEcho'] as const)('validates the %s document update', (reason) => {
    const payload = {
      reason,
      fileUri: 'vscode-test-web:/route.camel.yaml',
      content: '',
      ...(reason === 'saveEcho' ? { revision: 3 } : {}),
    };
    expect(requestCatalog['editor:document:setContent'].isRequest(payload)).toBe(true);
    expect(requestCatalog['editor:document:setContent'].isRequest({ ...payload, content: undefined })).toBe(false);
  });

  it('requires a boolean dirty state when initialization promises save acknowledgements', () => {
    const payload = requestExamples['editor:document:setContent'].payload;
    expect(requestCatalog['editor:document:setContent'].isRequest({ ...payload, isDirty: null })).toBe(false);
    expect(
      requestCatalog['editor:document:setContent'].isRequest({
        ...payload,
        isDirty: null,
        saveAcknowledgements: false,
      }),
    ).toBe(true);
  });

  it('rejects incomplete settings and invalid domain enum values', () => {
    const validator = eventCatalog['editor:settings:updated'].isPayload;
    for (const key of Object.keys(settings.settings)) {
      const incomplete: Record<string, unknown> = { ...settings.settings };
      delete incomplete[key];
      expect(validator({ ...settings, settings: incomplete })).toBe(false);
    }
    for (const key of ['nodeLabel', 'nodeToolbarTrigger', 'colorScheme', 'canvasLayoutDirection']) {
      expect(validator({ ...settings, settings: { ...settings.settings, [key]: 'unknown' } })).toBe(false);
    }
    expect(
      validator({
        ...settings,
        settings: { ...settings.settings, rest: { apicurioRegistryUrl: '', customMediaTypes: [1] } },
      }),
    ).toBe(false);
    expect(
      eventCatalog['editor:step:updated'].isPayload({ action: 'add', stepType: 'unknown', stepName: 'timer' }),
    ).toBe(false);
  });

  it('checks notification ranges and optional DTO fields', () => {
    const validate = requestCatalog['editor:document:validate'].isResponse;
    for (const range of [
      { start: { line: -1, character: 0 }, end: { line: 0, character: 0 } },
      { start: { line: 0, character: 0.5 }, end: { line: 0, character: 1 } },
      { start: { line: 1, character: 0 }, end: { line: 0, character: 0 } },
      { start: { line: 0, character: 2 }, end: { line: 0, character: 1 } },
    ])
      expect(validate({ notifications: [{ ...notification, range }] })).toBe(false);
    expect(validate({ notifications: [{ message: '', severity: 'info' }] })).toBe(true);
    expect(requestCatalog['host:ui:pickFile'].isRequest({ include: '**/*' })).toBe(true);
    expect(requestCatalog['host:ui:pickFile'].isRequest({ include: '**/*', options: { title: 0 } })).toBe(false);
    expect(
      requestCatalog['editor:suggestions:get'].isResponse({ suggestions: [{ value: 'bean', group: false }] }),
    ).toBe(false);
    expect(
      requestCatalog['editor:maven:getRuntimeInfo'].isResponse({
        runtimeInfo: { runtime: 'quarkus', camelVersion: '', quarkusVersion: 1 },
      }),
    ).toBe(false);
    for (const selection of [null, 'schema.xsd', []]) {
      expect(requestCatalog['host:ui:pickFile'].isResponse({ selection })).toBe(true);
    }
    expect(requestCatalog['editor:maven:getRuntimeInfo'].isResponse({ runtimeInfo: null })).toBe(true);
  });
});

describe('plain JSON validation', () => {
  it.each([
    undefined,
    NaN,
    Infinity,
    -Infinity,
    1n,
    Symbol('value'),
    () => null,
    new Date(),
    new Map(),
    new SettingsModel(),
    document.createElement('div'),
    { value: undefined },
    { value: () => null },
    { value: [Infinity] },
    new Array(1),
    { [Symbol('key')]: 'value' },
  ])('rejects non-JSON data: %s', (value) => {
    expect(isJsonValue(value)).toBe(false);
    expect(requestCatalog['editor:metadata:set'].isRequest({ key: 'value', value })).toBe(false);
    expect(requestCatalog['editor:metadata:get'].isResponse({ value })).toBe(false);
  });

  it('rejects cycles but accepts repeated references without a cycle', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonValue(cyclic)).toBe(false);
    const child = { value: [null, true, false, 0, 1.5, 'text'] };
    expect(isJsonValue({ first: child, second: child })).toBe(true);
    expect(isJsonValue(Object.assign(Object.create(null), child))).toBe(true);
  });

  it('rejects accessor properties without invoking them', () => {
    const getter = vi.fn(() => 'value');
    const value = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    expect(isJsonValue(value)).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });
});

// Compiled by the UI typecheck, never executed. Payload and result types must follow the request key.
async function checkContractTypes(bus: IEventBus) {
  // @ts-expect-error getContent has no input object
  void bus.request('editor:document:getContent', {});
  // @ts-expect-error callers cannot override a request's result type
  void bus.request<'editor:document:getContent', string>('editor:document:getContent', null);
  // @ts-expect-error no undefined event payloads
  bus.emit('editor:ready', undefined);
  // @ts-expect-error only catalog events exist
  bus.emit('editor:unknown', null);
  // @ts-expect-error functions cannot be metadata values
  void bus.request('editor:metadata:set', { key: 'bad', value: () => null });
  // @ts-expect-error request handlers must return the associated response
  bus.onRequest('editor:document:getContent', () => 'source');
  expectTypeOf(await bus.request('editor:document:getContent', null)).toEqualTypeOf<{
    content: string;
    revision: number;
  }>();
}
void checkContractTypes;
