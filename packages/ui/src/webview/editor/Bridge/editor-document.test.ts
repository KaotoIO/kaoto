import { createPostMessageBridge } from '../../../host-bridge/bridge';
import { BridgeError, IEventBus } from '../../../host-bridge/contracts';
import { createEventBus } from '../../../host-bridge/event-bus';
import { createMemoryTransports } from '../../../host-bridge/transports/memory';
import type { SourceDocument } from '../../../providers/source-code.provider';
import { useSourceCodeStore } from '../../../store';
import { bindEditorDocument, getFileNameFromUri } from './editor-document';

describe('getFileNameFromUri', () => {
  it.each([
    ['file:///home/u/projects/data.pipeline/routes/timer.camel.yaml', 'timer.camel.yaml'],
    ['file:///Users/john.piper/timer.camel.yaml', 'timer.camel.yaml'],
    ['file:///w/com.acme.integration/timer.camel.yaml', 'timer.camel.yaml'],
    ['git:/w/routes/timer.camel.xml?%7B%22path%22%3A%22%2Fw%22%7D', 'timer.camel.xml'],
    ['vscode-test-web:/route.camel.yaml#fragment', 'route.camel.yaml'],
    ['route.camel.yaml', 'route.camel.yaml'],
  ])('extracts the file name from %s', (uri, fileName) => {
    expect(getFileNameFromUri(uri)).toBe(fileName);
  });
});

describe('editor document binding', () => {
  let host: IEventBus;
  let editor: IEventBus;
  let binding: ReturnType<typeof bindEditorDocument>;
  let detach: () => void;
  let apply: ReturnType<typeof vi.fn<(document: SourceDocument) => void>>;
  const init = {
    reason: 'init',
    fileUri: 'route.camel.yaml',
    content: '',
    readonly: false,
  } as const;
  const content = () => useSourceCodeStore.getState().sourceCode;
  /** An edit made in the canvas: the provider updates the store and forwards the change */
  const edit = (next: string) => {
    useSourceCodeStore.getState().setSourceCode(next);
    binding.adapter.onChange?.(next);
  };

  beforeEach(async () => {
    useSourceCodeStore.setState({ sourceCode: '', path: undefined });
    host = createEventBus({ role: 'host', onError: vi.fn() });
    editor = createEventBus({ role: 'editor', onError: vi.fn() });
    const transports = createMemoryTransports();
    await Promise.all([
      createPostMessageBridge({ bus: host, transport: transports.host }).connect(),
      createPostMessageBridge({ bus: editor, transport: transports.editor }).connect(),
    ]);
    // Mirrors the provider: host content lands in the store without being forwarded back to the adapter.
    apply = vi.fn(({ code, path }: SourceDocument) => {
      useSourceCodeStore.setState({ sourceCode: code, path });
    });
    binding = bindEditorDocument(editor);
    detach = binding.attach();
    binding.adapter.subscribe(apply);
  });
  afterEach(() => {
    detach();
    binding?.dispose();
    host.dispose();
    editor.dispose();
  });

  it('sends only the file name to the editor, so ancestor folders do not affect the resource type', async () => {
    await host.request('host:document:setContent', {
      ...init,
      fileUri: 'file:///home/u/projects/data.pipeline/routes/timer.camel.yaml',
    });
    expect(apply).toHaveBeenCalledWith({ code: '', path: 'timer.camel.yaml' });
  });

  it('applies an empty base before the initial document, as the fallback for a document that does not parse', async () => {
    await host.request('host:document:setContent', { ...init, content: '- from: {' });
    expect(apply.mock.calls).toEqual([
      [{ code: '', path: 'route.camel.yaml' }],
      [{ code: '- from: {', path: 'route.camel.yaml' }],
    ]);
  });

  it('can be attached again after being detached, as a Strict Mode effect replay does', async () => {
    detach();
    detach = binding.attach();
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
  });

  it('reports NOT_READY before the provider subscribes and for snapshots before init', async () => {
    await expect(host.request('host:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_READY' });
    detach();
    binding.dispose();
    binding = bindEditorDocument(editor);
    detach = binding.attach();
    await expect(host.request('host:document:setContent', init)).rejects.toMatchObject({ code: 'NOT_READY' });
  });

  it('delegates undo to the host with the current revision without emitting another edit', async () => {
    const changed = vi.fn();
    const applyHistory = vi.fn(async () => null);
    host.on('editor:document:changed', changed);
    host.onRequest('editor:undoRedo:apply', applyHistory);
    await host.request('host:document:setContent', init);
    edit('edited');
    await vi.waitFor(() => {
      expect(changed).toHaveBeenCalledOnce();
    });
    changed.mockClear();
    await binding.applyHistory('undo');
    expect(applyHistory).toHaveBeenCalledWith({ command: 'undo', revision: 1 }, expect.anything());
    expect(content()).toBe('edited');
    await host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: '' });
    expect(content()).toBe('');
    expect(changed).not.toHaveBeenCalled();
  });

  it('releases the busy state after a host history failure', async () => {
    host.onRequest('editor:undoRedo:apply', async () => {
      throw new BridgeError('NOT_READY', 'Another document is active');
    });
    await host.request('host:document:setContent', init);
    await expect(binding.applyHistory('undo')).rejects.toMatchObject({ code: 'NOT_READY' });
    expect(binding.getState().historyPending).toBe(false);
    expect(content()).toBe('');
  });

  it('publishes edits after an empty init and counts host changes as revisions', async () => {
    const changed = vi.fn();
    host.on('editor:document:changed', changed);
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
    edit('first edit');
    await expect(host.request('host:document:getContent', null)).resolves.toEqual({
      content: 'first edit',
      revision: 1,
    });
    await host.request('host:document:setContent', {
      reason: 'hostUpdate',
      fileUri: init.fileUri,
      content: 'external',
    });
    expect(changed).toHaveBeenCalledExactlyOnceWith({ content: 'first edit', revision: 1 });
    await expect(host.request('host:document:getContent', null)).resolves.toEqual({
      content: 'external',
      revision: 2,
    });
  });

  it('ignores a repeated init without applying content again', async () => {
    await host.request('host:document:setContent', init);
    edit('newer');
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: false, revision: 1 });
    expect(apply).toHaveBeenCalledTimes(2);
    expect(content()).toBe('newer');
  });

  it('skips host content identical to the current document', async () => {
    await host.request('host:document:setContent', init);
    edit('same');
    await expect(
      host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'same' }),
    ).resolves.toEqual({ applied: false, revision: 1 });
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('applies authoritative updates even when their text matches an older edit', async () => {
    await host.request('host:document:setContent', init);
    edit('A');
    edit('B');
    await expect(
      host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'A' }),
    ).resolves.toEqual({ applied: true, revision: 3 });
    expect(content()).toBe('A');
  });

  it('ignores edits and rejects history for a read-only document', async () => {
    const changed = vi.fn();
    host.on('editor:document:changed', changed);
    await host.request('host:document:setContent', { ...init, readonly: true });
    edit('not allowed');
    await expect(binding.applyHistory('undo')).rejects.toMatchObject({ code: 'NOT_READY' });
    await expect(host.request('host:document:getContent', null)).resolves.toEqual({
      content: 'not allowed',
      revision: 0,
    });
    expect(changed).not.toHaveBeenCalled();
  });

  it('keeps initialization disabled after a failed load and permits a deliberate retry', async () => {
    apply.mockImplementationOnce(() => {
      throw new BridgeError('IO_ERROR', 'read failed');
    });
    await expect(host.request('host:document:setContent', init)).rejects.toMatchObject({ code: 'IO_ERROR' });
    expect(binding.getState().initialized).toBe(false);
    expect(binding.getState().error).toMatchObject({ message: 'read failed' });
    detach();
    binding.dispose();
    binding = bindEditorDocument(editor);
    detach = binding.attach();
    binding.adapter.subscribe(apply);
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
  });

  it('reports a startup error when the host never initializes a ready editor', async () => {
    vi.useFakeTimers();
    try {
      binding.ready();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(binding.getState().error).toMatchObject({ code: 'TIMEOUT' });
      expect(binding.getState().initialized).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suspends mutations on disconnect while retaining the content and revision', async () => {
    await host.request('host:document:setContent', init);
    edit('unsaved');
    binding.suspend(new BridgeError('NOT_CONNECTED', 'Host disconnected'));
    await expect(host.request('host:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    expect(content()).toBe('unsaved');
    expect(binding.getState().initialized).toBe(true);
  });

  it('stops delivering content after the provider unsubscribes', async () => {
    await host.request('host:document:setContent', init);
    binding.adapter.subscribe(apply)();
    await expect(
      host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'late' }),
    ).rejects.toMatchObject({ code: 'NOT_READY' });
    expect(content()).toBe('');
  });

  it('redelivers the current document to a provider mounted after initialization', async () => {
    const changed = vi.fn();
    host.on('editor:document:changed', changed);
    await host.request('host:document:setContent', { ...init, content: '- route: {}' });
    edit('- route: { id: edited }');
    await vi.waitFor(() => {
      expect(changed).toHaveBeenCalledOnce();
    });
    const remounted = vi.fn();
    binding.adapter.subscribe(remounted);

    expect(remounted).toHaveBeenCalledExactlyOnceWith({ code: '- route: { id: edited }', path: 'route.camel.yaml' });
    expect(changed).toHaveBeenCalledOnce();
    await expect(host.request('host:document:getContent', null)).resolves.toEqual({
      content: '- route: { id: edited }',
      revision: 1,
    });
  });
});
