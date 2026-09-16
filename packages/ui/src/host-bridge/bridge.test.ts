import { afterEach, describe, expect, it, vi } from 'vitest';

import { createIframeTransport, createMemoryTransports, createPostMessageBridge } from './bridge.js';
import { BridgeError, type ControlMessage, type MessageTransport, type WireMessage } from './contracts.js';
import { createEventBus } from './event-bus.js';

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => {
      dispose();
    });
  vi.useRealTimers();
});

const tick = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
async function expectRejection(pending: Promise<unknown>, code: string): Promise<void> {
  await expect(pending).rejects.toMatchObject({ code });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function pair() {
  const hostError = vi.fn();
  const editorError = vi.fn();
  const host = createEventBus({ role: 'host', onError: hostError });
  const editor = createEventBus({ role: 'editor', onError: editorError });
  cleanup.push(
    () => {
      host.dispose();
    },
    () => {
      editor.dispose();
    },
  );
  const transports = createMemoryTransports();
  const hostBridge = createPostMessageBridge({ bus: host, transport: transports.host });
  const editorBridge = createPostMessageBridge({ bus: editor, transport: transports.editor });
  cleanup.push(
    () => {
      hostBridge.dispose();
    },
    () => {
      editorBridge.dispose();
    },
  );
  return {
    host,
    editor,
    hostBridge,
    editorBridge,
    hostError,
    editorError,
    transports,
    connect: () => Promise.all([hostBridge.connect(), editorBridge.connect()]),
  };
}

describe('connected host bridge', () => {
  it('addresses the peer and rejects pending work on disposal', async () => {
    const { host, editor, hostBridge, connect } = pair();
    await connect();
    editor.onRequest('editor:document:getContent', () => new Promise(() => {}));
    const pending = host.request('editor:document:getContent', null);
    const rejection = expectRejection(pending, 'DISPOSED');
    hostBridge.dispose();
    await rejection;
  });

  it('returns the peer handler result', async () => {
    const { host, editor, connect } = pair();
    editor.onRequest('editor:document:getContent', () => ({ content: 'route', revision: 2 }));
    host.onRequest('editor:metadata:get', ({ key }) => ({ value: key }));
    await connect();
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({ content: 'route', revision: 2 });
    await expect(editor.request('editor:metadata:get', { key: 'filePath' })).resolves.toEqual({ value: 'filePath' });
  });

  it('delivers events asynchronously once without echoing them back', async () => {
    const { host, editor, connect } = pair();
    await connect();
    const local = vi.fn();
    const peer = vi.fn();
    editor.on('editor:document:changed', local);
    host.on('editor:document:changed', peer);
    const snapshot = { content: 'one', revision: 1 };
    editor.emit('editor:document:changed', snapshot);
    expect(local).toHaveBeenCalledExactlyOnceWith(snapshot);
    expect(peer).not.toHaveBeenCalled();
    await tick();
    expect(peer).toHaveBeenCalledExactlyOnceWith({ content: 'one', revision: 1 });
    expect(peer.mock.calls[0][0]).not.toBe(snapshot);
    await tick();
    expect(local).toHaveBeenCalledTimes(1);
  });

  it('preserves sender order and separates request payloads and responses', async () => {
    const { host, editor, connect } = pair();
    const payload = { key: 'nested', value: { values: ['initial'] } };
    const received: unknown[] = [];
    host.onRequest('editor:metadata:set', (value) => {
      received.push(value);
      return null;
    });
    const response = { value: { path: 'route' } };
    host.onRequest('editor:metadata:get', () => response);
    await connect();
    const first = editor.request('editor:metadata:set', payload);
    const second = editor.request('editor:metadata:set', { key: 'second', value: null });
    await Promise.all([first, second]);
    expect(received).toEqual([payload, { key: 'second', value: null }]);
    expect(received[0]).not.toBe(payload);
    expect((received[0] as typeof payload).value).not.toBe(payload.value);
    const result = await editor.request('editor:metadata:get', { key: 'nested' });
    expect(result).toEqual(response);
    expect(result.value).not.toBe(response.value);
  });

  it('correlates out-of-order responses independently', async () => {
    const { host, editor, connect } = pair();
    const first = deferred<{ value: string }>();
    host.onRequest('editor:metadata:get', ({ key }) => (key === 'first' ? first.promise : { value: 'second' }));
    await connect();
    const pendingFirst = editor.request('editor:metadata:get', { key: 'first' });
    await expect(editor.request('editor:metadata:get', { key: 'second' })).resolves.toEqual({ value: 'second' });
    first.resolve({ value: 'first' });
    await expect(pendingFirst).resolves.toEqual({ value: 'first' });
  });

  it('rejects missing handlers and preserves structured handler failures', async () => {
    const { host, editor, connect } = pair();
    await connect();
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({
      code: 'UNSUPPORTED_REQUEST',
    });
    editor.onRequest('editor:document:getContent', () => {
      throw new BridgeError('NOT_READY', 'Editor is loading');
    });
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({
      code: 'NOT_READY',
      message: 'Editor is loading',
    });
    host.onRequest('editor:resource:save', () => {
      throw new BridgeError('IO_ERROR', 'Disk full');
    });
    await expect(editor.request('editor:resource:save', { path: 'schema.xsd', content: '' })).rejects.toMatchObject({
      code: 'IO_ERROR',
      message: 'Disk full',
    });
  });

  it('rejects invalid handler results instead of returning successful malformed data', async () => {
    const { host, editor, connect } = pair();
    editor.onRequest('editor:document:getContent', () => ({ content: 'route', revision: -1 }));
    host.onRequest('editor:metadata:get', () => ({ value: () => null }) as never);
    await connect();
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'INVALID_MESSAGE' });
    await expect(editor.request('editor:metadata:get', { key: 'invalid' })).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
  });

  it('retains an accepted handler after it is unregistered', async () => {
    const { host, editor, connect } = pair();
    const result = deferred<{ content: string; revision: number }>();
    const unregister = editor.onRequest('editor:document:getContent', () => result.promise);
    await connect();
    const pending = host.request('editor:document:getContent', null);
    await tick();
    unregister();
    result.resolve({ content: 'accepted', revision: 1 });
    await expect(pending).resolves.toEqual({ content: 'accepted', revision: 1 });
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({
      code: 'UNSUPPORTED_REQUEST',
    });
  });

  it.each(['hostBridge', 'editor', 'transport'] as const)(
    'settles pending work and aborts receivers when %s is disposed',
    async (owner) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { host, editor, hostBridge, connect, transports } = pair();
      let signal: AbortSignal | undefined;
      editor.onRequest('editor:document:getContent', (_payload, context) => {
        signal = context.signal;
        return new Promise(() => {});
      });
      await connect();
      const pending = host.request('editor:document:getContent', null);
      const rejection = expectRejection(pending, 'DISPOSED');
      await tick();
      expect(signal?.aborted).toBe(false);
      if (owner === 'hostBridge') hostBridge.dispose();
      else if (owner === 'editor') editor.dispose();
      else transports.host.dispose();
      await rejection;
      expect(signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

describe('request deadlines and cancellation', () => {
  it.each([
    ['host', 'editor:document:getContent', null, 5000],
    ['editor', 'editor:suggestions:get', { topic: 'bean', word: '', context: {} }, 2000],
    ['editor', 'editor:maven:getRuntimeInfo', null, 60000],
  ] as const)('uses the %s deadline for %s', async (role, name, payload, deadline) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const pairValue = pair();
    const caller = pairValue[role];
    const receiver = role === 'host' ? pairValue.editor : pairValue.host;
    let signal: AbortSignal | undefined;
    receiver.onRequest(name, (_payload, context) => {
      signal = context.signal;
      return new Promise(() => {});
    });
    await pairValue.connect();
    const pending = caller.request(name, payload);
    const settled = vi.fn();
    void pending.then(settled, settled);
    const rejection = expectRejection(pending, 'TIMEOUT');
    await vi.advanceTimersByTimeAsync(deadline - 1);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    await tick();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, null])('keeps file picking pending without an automatic deadline (%s)', async (timeoutMs) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { host, editor, connect } = pair();
    host.onRequest('host:ui:pickFile', () => new Promise(() => {}));
    await connect();
    const controller = new AbortController();
    const pending = editor.request('host:ui:pickFile', { include: '**/*' }, { timeoutMs, signal: controller.signal });
    const rejection = expectRejection(pending, 'CANCELLED');
    await vi.advanceTimersByTimeAsync(120000);
    expect(vi.getTimerCount()).toBe(0);
    controller.abort();
    await rejection;
  });

  it('honors a positive timeout override and removes its abort listener', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { host, editor, connect } = pair();
    editor.onRequest('editor:document:getContent', () => new Promise(() => {}));
    await connect();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const rejection = expectRejection(
      host.request('editor:document:getContent', null, { timeoutMs: 15, signal: controller.signal }),
      'TIMEOUT',
    );
    await vi.advanceTimersByTimeAsync(15);
    await rejection;
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, Infinity, NaN])('rejects invalid timeout %s before invoking a handler', async (timeoutMs) => {
    const { host, editor, connect } = pair();
    const handler = vi.fn(() => ({ content: '', revision: 0 }));
    editor.onRequest('editor:document:getContent', handler);
    await connect();
    await expect(host.request('editor:document:getContent', null, { timeoutMs })).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not send a request whose signal was already aborted', async () => {
    const { host, editor, connect } = pair();
    const handler = vi.fn(() => ({ content: '', revision: 0 }));
    editor.onRequest('editor:document:getContent', handler);
    await connect();
    const controller = new AbortController();
    controller.abort();
    await expect(host.request('editor:document:getContent', null, { signal: controller.signal })).rejects.toMatchObject(
      { code: 'CANCELLED' },
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('aborts the receiver and ignores a late result without retrying the write', async () => {
    const { host, editor, connect, hostError, editorError } = pair();
    const result = deferred<null>();
    let signal: AbortSignal | undefined;
    const write = vi.fn((_payload, context) => {
      signal = context.signal;
      return result.promise;
    });
    host.onRequest('editor:resource:save', write);
    await connect();
    const controller = new AbortController();
    const pending = editor.request(
      'editor:resource:save',
      { path: 'schema.xsd', content: 'saved' },
      { signal: controller.signal },
    );
    const rejection = expectRejection(pending, 'CANCELLED');
    await tick();
    controller.abort();
    await rejection;
    await tick();
    expect(signal?.aborted).toBe(true);
    result.resolve(null);
    await tick();
    expect(write).toHaveBeenCalledTimes(1);
    expect(hostError).not.toHaveBeenCalled();
    expect(editorError).not.toHaveBeenCalled();
  });
});

const header = { protocol: 'kaoto-host-bridge', version: 1 } as const;
function supplied(role: 'host' | 'editor' = 'host') {
  const onError = vi.fn();
  const bus = createEventBus({ role, onError });
  const sent: Array<WireMessage | ControlMessage> = [];
  let receive = (_value: unknown) => {};
  let sendFailure: (() => void | Promise<void>) | undefined;
  const transport: MessageTransport = {
    send(message) {
      sent.push(message);
      return sendFailure?.();
    },
    onMessage(handler) {
      receive = handler;
      return () => {
        receive = () => {};
      };
    },
    dispose: vi.fn(),
  };
  const bridge = createPostMessageBridge({ bus, transport });
  cleanup.push(
    () => {
      bus.dispose();
    },
    () => {
      bridge.dispose();
    },
  );
  const connected = bridge.connect();
  void connected.catch(() => {});
  const session = () => {
    const welcomes = sent.filter((message) => message.kind === 'welcome');
    return welcomes[welcomes.length - 1].sessionId;
  };
  return {
    bus,
    bridge,
    transport,
    sent,
    connected,
    onError,
    session,
    receive: (value: unknown) => {
      receive(value);
    },
    failSend: (failure: () => void | Promise<void>) => {
      sendFailure = failure;
    },
    establish: async () => {
      if (role === 'host') receive({ ...header, kind: 'hello', editorBootId: 'boot-1' });
      else {
        const hello = sent.find((message) => message.kind === 'hello')!;
        receive({ ...header, kind: 'welcome', editorBootId: hello.editorBootId, sessionId: 'editor-session' });
      }
      await connected;
    },
  };
}

function lastRequest(sent: Array<WireMessage | ControlMessage>) {
  const requests = sent.filter((message) => message.kind === 'request');
  return requests[requests.length - 1];
}

describe('handshake and session ownership', () => {
  it('rejects the handshake when the host cannot send its welcome', async () => {
    const fixture = supplied();
    fixture.failSend(() => Promise.reject(new Error('Welcome delivery failed')));
    const rejection = expectRejection(fixture.connected, 'IO_ERROR');
    fixture.receive({ ...header, kind: 'hello', editorBootId: 'boot-1' });
    await rejection;
  });

  it('rejects a welcome using an incompatible protocol version', async () => {
    const fixture = supplied('editor');
    const hello = fixture.sent.find((message) => message.kind === 'hello')!;
    const rejection = expectRejection(fixture.connected, 'INCOMPATIBLE_VERSION');
    fixture.receive({
      ...header,
      version: 2,
      kind: 'welcome',
      editorBootId: hello.editorBootId,
      sessionId: 'unsupported',
    });
    await rejection;
  });

  it('treats a missing version as a malformed hello and can still accept a valid hello', async () => {
    const fixture = supplied();
    fixture.receive({ protocol: 'kaoto-host-bridge', kind: 'hello', editorBootId: 'incomplete' });
    expect(fixture.sent).toHaveLength(0);
    await fixture.establish();
  });
  it('makes connect idempotent and rejects a second active attachment', async () => {
    const { host, hostBridge, editorBridge, transports } = pair();
    const first = hostBridge.connect();
    expect(hostBridge.connect()).toBe(first);
    expect(() => createPostMessageBridge({ bus: host, transport: transports.host })).toThrow();
    await Promise.all([first, editorBridge.connect()]);
    hostBridge.dispose();
    await expect(hostBridge.connect()).rejects.toMatchObject({ code: 'DISPOSED' });
  });

  it.each([undefined, 25])('fails a handshake at its configured deadline (%s)', async (handshakeTimeoutMs) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const bus = createEventBus({ role: 'host', onError: vi.fn() });
    const transports = createMemoryTransports();
    const bridge = createPostMessageBridge({ bus, transport: transports.host, handshakeTimeoutMs });
    cleanup.push(
      () => {
        bus.dispose();
      },
      () => {
        bridge.dispose();
      },
    );
    const rejection = expectRejection(bridge.connect(), 'TIMEOUT');
    await vi.advanceTimersByTimeAsync(handshakeTimeoutMs ?? 5000);
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the current session for duplicate hello and retires old boots', async () => {
    const fixture = supplied();
    await fixture.establish();
    const originalSession = fixture.session();
    fixture.receive({ ...header, kind: 'hello', editorBootId: 'boot-1' });
    expect(fixture.session()).toBe(originalSession);
    const pending = fixture.bus.request('editor:document:getContent', null);
    const rejection = expectRejection(pending, 'DISPOSED');
    let signal: AbortSignal | undefined;
    fixture.bus.onRequest('editor:metadata:set', (_payload, context) => {
      signal = context.signal;
      return new Promise(() => {});
    });
    fixture.receive({
      ...header,
      kind: 'request',
      sessionId: originalSession,
      id: 'old-write',
      name: 'editor:metadata:set',
      payload: { key: 'value', value: 1 },
    });
    fixture.receive({ ...header, kind: 'hello', editorBootId: 'boot-2' });
    await rejection;
    expect(signal?.aborted).toBe(true);
    const currentSession = fixture.session();
    expect(currentSession).not.toBe(originalSession);
    const sentCount = fixture.sent.length;
    fixture.receive({ ...header, kind: 'hello', editorBootId: 'boot-1' });
    expect(fixture.sent).toHaveLength(sentCount);
    const listener = vi.fn();
    fixture.bus.on('editor:ready', listener);
    fixture.receive({ ...header, kind: 'event', sessionId: originalSession, name: 'editor:ready', payload: null });
    fixture.receive({ ...header, kind: 'event', sessionId: currentSession, name: 'editor:ready', payload: null });
    expect(listener).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('accepts only the welcome for the current editor boot and does not replace an established session', async () => {
    const fixture = supplied('editor');
    const hello = fixture.sent.find((message) => message.kind === 'hello')!;
    fixture.receive({ ...header, kind: 'welcome', editorBootId: 'foreign-boot', sessionId: 'foreign-session' });
    await expect(fixture.bus.request('editor:metadata:get', { key: 'value' })).rejects.toMatchObject({
      code: 'NOT_CONNECTED',
    });
    await fixture.establish();
    fixture.receive({ ...header, kind: 'welcome', editorBootId: hello.editorBootId, sessionId: 'replacement-session' });
    const pending = fixture.bus.request('editor:metadata:get', { key: 'value' });
    const request = lastRequest(fixture.sent);
    expect(request.sessionId).toBe('editor-session');
    fixture.receive({
      ...header,
      kind: 'response',
      sessionId: 'editor-session',
      id: request.id,
      name: request.name,
      ok: true,
      payload: { value: null },
    });
    await expect(pending).resolves.toEqual({ value: null });
  });

  it('rejects incompatible versions with a control response', async () => {
    const fixture = supplied();
    const rejection = expectRejection(fixture.connected, 'INCOMPATIBLE_VERSION');
    fixture.receive({ ...header, version: 2, kind: 'hello', editorBootId: 'unsupported' });
    await rejection;
    expect(fixture.sent).toContainEqual({
      ...header,
      kind: 'rejected',
      editorBootId: 'unsupported',
      error: { code: 'INCOMPATIBLE_VERSION', message: expect.any(String) },
    });
  });

  it('propagates a rejection for the current boot', async () => {
    const fixture = supplied('editor');
    const hello = fixture.sent.find((message) => message.kind === 'hello')!;
    const rejection = expectRejection(fixture.connected, 'INCOMPATIBLE_VERSION');
    fixture.receive({
      ...header,
      kind: 'rejected',
      editorBootId: hello.editorBootId,
      error: { code: 'INCOMPATIBLE_VERSION', message: 'Unsupported version' },
    });
    await rejection;
  });

  it.each([
    null,
    [],
    { ...header, kind: 'hello' },
    { ...header, kind: 'hello', editorBootId: '' },
    { protocol: 'foreign', version: 1, kind: 'hello', editorBootId: 'boot' },
    { ...header, kind: 'welcome', editorBootId: 'boot', sessionId: 'foreign' },
  ])('drops malformed or wrong-role control input %s', async (message) => {
    const fixture = supplied();
    fixture.receive(message);
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.onError).toHaveBeenCalled();
    await fixture.establish();
  });
});

describe('untrusted frames', () => {
  it.each([
    { name: 'unknown', payload: null },
    { name: 'editor:document:getContent', payload: null },
    { name: 'editor:metadata:set', payload: { key: 'value', value: undefined } },
    { name: 'editor:metadata:set', payload: { key: 'value', value: () => 1 } },
  ])('rejects an identifiable invalid request %s without invoking a handler', async ({ name, payload }) => {
    const fixture = supplied();
    const handler = vi.fn(() => null);
    fixture.bus.onRequest('editor:metadata:set', handler);
    await fixture.establish();
    fixture.receive({ ...header, kind: 'request', sessionId: fixture.session(), id: 'invalid', name, payload });
    await tick();
    expect(handler).not.toHaveBeenCalled();
    expect(fixture.sent).toContainEqual({
      ...header,
      kind: 'response',
      sessionId: fixture.session(),
      id: 'invalid',
      name,
      ok: false,
      error: { code: 'INVALID_MESSAGE', message: expect.any(String) },
    });
  });

  it.each([
    { name: 'editor:ready', payload: null, sessionId: 'foreign' },
    { name: 'host:theme:changed', payload: { theme: 'dark' } },
    { name: 'editor:ready', payload: {} },
    { name: 'toString', payload: null },
    { name: 'editor:ready', payload: null, version: 2 },
  ])('drops invalid event %s', async (fields) => {
    const fixture = supplied();
    const listener = vi.fn();
    fixture.bus.on('editor:ready', listener);
    fixture.bus.on('host:theme:changed', listener);
    await fixture.establish();
    fixture.receive({ ...header, kind: 'event', sessionId: fixture.session(), ...fields });
    expect(listener).not.toHaveBeenCalled();
    expect(fixture.onError).toHaveBeenCalled();
  });

  it.each([
    { name: 'editor:preview:get', ok: true, payload: { svg: null } },
    { name: 'editor:document:getContent', ok: true, payload: { content: '', revision: -1 } },
    { name: 'editor:document:getContent', ok: true, payload: undefined },
    { name: 'editor:document:getContent', ok: false, error: { code: 'ENOENT', message: 'missing' } },
    { name: 'editor:document:getContent', payload: { content: '', revision: 0 } },
  ])('rejects a matching malformed response %s', async (fields) => {
    const fixture = supplied();
    await fixture.establish();
    const pending = fixture.bus.request('editor:document:getContent', null);
    const rejection = expectRejection(pending, 'INVALID_MESSAGE');
    const request = lastRequest(fixture.sent);
    fixture.receive({ ...header, kind: 'response', sessionId: fixture.session(), id: request.id, ...fields });
    await rejection;
  });

  it('ignores duplicate and stale responses without settling another request', async () => {
    const fixture = supplied();
    await fixture.establish();
    const first = fixture.bus.request('editor:document:getContent', null);
    const request = lastRequest(fixture.sent);
    const response = {
      ...header,
      kind: 'response',
      sessionId: fixture.session(),
      id: request.id,
      name: request.name,
      ok: true,
      payload: { content: 'first', revision: 1 },
    };
    fixture.receive(response);
    await expect(first).resolves.toEqual({ content: 'first', revision: 1 });
    const second = fixture.bus.request('editor:document:getContent', null);
    const next = lastRequest(fixture.sent);
    const settled = vi.fn();
    void second.then(settled);
    fixture.receive(response);
    fixture.receive({ ...response, id: next.id, sessionId: 'retired-session' });
    await tick();
    expect(settled).not.toHaveBeenCalled();
    fixture.receive({ ...response, id: next.id, payload: { content: 'second', revision: 2 } });
    await expect(second).resolves.toEqual({ content: 'second', revision: 2 });
  });

  it('does not execute a duplicated write request twice', async () => {
    const fixture = supplied();
    const write = vi.fn(() => null);
    fixture.bus.onRequest('editor:resource:save', write);
    await fixture.establish();
    const message = {
      ...header,
      kind: 'request',
      sessionId: fixture.session(),
      id: 'write-once',
      name: 'editor:resource:save',
      payload: { path: 'schema.xsd', content: '' },
    };
    fixture.receive(message);
    fixture.receive(message);
    await tick();
    fixture.receive(message);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('serializes only error code and message from a thrown Error', async () => {
    const fixture = supplied();
    fixture.bus.onRequest('editor:metadata:get', () => {
      throw new Error('Lookup failed');
    });
    await fixture.establish();
    fixture.receive({
      ...header,
      kind: 'request',
      sessionId: fixture.session(),
      id: 'lookup',
      name: 'editor:metadata:get',
      payload: { key: 'value' },
    });
    await tick();
    expect(fixture.sent).toContainEqual({
      ...header,
      kind: 'response',
      sessionId: fixture.session(),
      id: 'lookup',
      name: 'editor:metadata:get',
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Lookup failed' },
    });
  });
});

describe('transport boundaries', () => {
  it('finishes cleanup even when the local error callback throws', async () => {
    const fixture = supplied();
    await fixture.establish();
    fixture.onError.mockImplementation(() => {
      throw new Error('Diagnostic failed');
    });
    fixture.failSend(() => {
      throw new Error('Send failed');
    });
    await expect(fixture.bus.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'IO_ERROR' });
    expect(fixture.transport.dispose).toHaveBeenCalledTimes(1);
  });

  it('releases request timers and abort listeners on a successful response', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { host, editor, connect } = pair();
    editor.onRequest('editor:document:getContent', () => ({ content: '', revision: 0 }));
    await connect();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await expect(host.request('editor:document:getContent', null, { signal: controller.signal })).resolves.toEqual({
      content: '',
      revision: 0,
    });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([
    [
      'throw',
      () => {
        throw new Error('send failed');
      },
    ],
    ['reject', () => Promise.reject(new Error('send failed'))],
    // Fault injection: a VS Code adapter must convert its boolean result to a failure.
    ['false', () => Promise.resolve(false) as unknown as Promise<void>],
  ] as const)(
    'rejects all pending work when sending returns %s and reports the connection failure',
    async (_name, fail) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const fixture = supplied();
      await fixture.establish();
      const first = fixture.bus.request('editor:document:getContent', null);
      const firstRejection = expectRejection(first, 'IO_ERROR');
      fixture.failSend(fail);
      const secondRejection = expectRejection(fixture.bus.request('editor:preview:get', null), 'IO_ERROR');
      await Promise.all([firstRejection, secondRejection]);
      expect(fixture.onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'IO_ERROR' }));
      expect(fixture.transport.dispose).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('rejects non-JSON data before memory serialization can discard it', () => {
    const transports = createMemoryTransports();
    cleanup.push(() => {
      transports.host.dispose();
    });
    expect(() =>
      transports.host.send({ ...header, kind: 'hello', editorBootId: 'boot', hidden: undefined } as never),
    ).toThrow(expect.objectContaining({ code: 'INVALID_MESSAGE' }));
  });

  it('binds an iframe to its exact peer and origin and removes its listener on bridge disposal', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    cleanup.push(() => {
      iframe.remove();
    });
    const peer = iframe.contentWindow!;
    const post = vi.spyOn(peer, 'postMessage').mockImplementation(() => {});
    cleanup.push(() => {
      post.mockRestore();
    });
    const transport = createIframeTransport({
      localWindow: window,
      peerWindow: peer,
      targetOrigin: 'https://kaoto.example',
    });
    const host = createEventBus({ role: 'host', onError: vi.fn() });
    const bridge = createPostMessageBridge({ bus: host, transport });
    cleanup.push(
      () => {
        host.dispose();
      },
      () => {
        bridge.dispose();
      },
    );
    const connected = bridge.connect();
    const hello = { ...header, kind: 'hello', editorBootId: 'iframe-boot' };
    window.dispatchEvent(new MessageEvent('message', { source: window, origin: 'https://kaoto.example', data: hello }));
    window.dispatchEvent(new MessageEvent('message', { source: peer, origin: 'https://foreign.example', data: hello }));
    expect(post).not.toHaveBeenCalled();
    window.dispatchEvent(new MessageEvent('message', { source: peer, origin: 'https://kaoto.example', data: hello }));
    await connected;
    expect(post).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ kind: 'welcome', editorBootId: 'iframe-boot' }),
      'https://kaoto.example',
    );
    bridge.dispose();
    window.dispatchEvent(new MessageEvent('message', { source: peer, origin: 'https://kaoto.example', data: hello }));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each(['*', 'null', '', 'https://kaoto.example/path'])('rejects unsupported iframe origin %s', (targetOrigin) => {
    expect(() => createIframeTransport({ localWindow: window, peerWindow: window, targetOrigin })).toThrow();
  });
});
