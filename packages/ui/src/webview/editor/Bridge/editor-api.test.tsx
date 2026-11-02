import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';

import { createPostMessageBridge } from '../../../host-bridge/bridge';
import { BridgeError, IEventBus } from '../../../host-bridge/contracts';
import { createEventBus } from '../../../host-bridge/event-bus';
import { createMemoryTransports } from '../../../host-bridge/transports/memory';
import { useSourceCodeStore } from '../../../store';
import { bindEditorDocument, type SourceCodeBridgeProviderRef, useEditorApi } from './editor-api';

describe('useEditorApi', () => {
  const mockSetCodeAndNotify = vi.fn();
  let originalSetCodeAndNotify: typeof mockSetCodeAndNotify;

  const renderEditorApi = () => renderHook(() => useEditorApi());

  beforeEach(() => {
    originalSetCodeAndNotify = useSourceCodeStore.getState().setCodeAndNotify as typeof mockSetCodeAndNotify;
    act(() => {
      /* Start from a pristine store and an empty undo/redo history */
      useSourceCodeStore.setState({ sourceCode: '', path: '', setCodeAndNotify: mockSetCodeAndNotify });
      useSourceCodeStore.temporal.setState({ pastStates: [], futureStates: [] });
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useSourceCodeStore.setState({ setCodeAndNotify: originalSetCodeAndNotify });
    });
  });

  it('should initialize editorApi and sourceCodeRef', () => {
    const { result } = renderEditorApi();

    expect(result.current.editorApi).toBeDefined();
    expect(result.current.sourceCodeRef.current).toBe('');
  });

  it('should set content when setContent is called', async () => {
    const { result } = renderEditorApi();

    const path = 'test-path';
    const content = 'test-content';

    await act(async () => {
      await result.current.editorApi.setContent(path, content);
    });

    expect(mockSetCodeAndNotify).toHaveBeenCalledWith(content, path);
    expect(result.current.sourceCodeRef.current).toBe(content);
  });

  it('should not update content if the new content is the same as the current one', async () => {
    const { result } = renderEditorApi();

    const path = 'test-path';
    const content = 'test-content';

    await act(async () => {
      await result.current.editorApi.setContent(path, content);
    });

    expect(mockSetCodeAndNotify).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.editorApi.setContent(path, content);
    });

    expect(mockSetCodeAndNotify).toHaveBeenCalledTimes(1);
  });

  it('preserves history when the host repeats identical content', async () => {
    const clearSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'clear');
    const { result, unmount } = renderHook(() => useEditorApi());
    try {
      await act(async () => {
        await result.current.editorApi.setContent('route.camel.yaml', '- route: {}');
      });
      clearSpy.mockClear();
      await act(async () => {
        await result.current.editorApi.setContent('route.camel.yaml', '- route: {}');
      });
      expect(clearSpy).not.toHaveBeenCalled();
    } finally {
      unmount();
      clearSpy.mockRestore();
    }
  });

  it('should get content when getContent is called', async () => {
    const { result } = renderEditorApi();

    const content = 'test-content';
    result.current.sourceCodeRef.current = content;

    const retrievedContent = await result.current.editorApi.getContent();

    expect(retrievedContent).toBe(content);
  });

  it('initializes an empty document and clears history only once', async () => {
    const clearSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'clear');
    const { result } = renderHook(() => useEditorApi());
    await act(async () => {
      await result.current.editorApi.setContent('empty.camel.yaml', '');
      await result.current.editorApi.setContent('empty.camel.yaml', 'first edit');
    });
    expect(mockSetCodeAndNotify).toHaveBeenNthCalledWith(1, '', 'empty.camel.yaml');
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should clear pastState when loading the store for the first time', async () => {
    const clearSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'clear');

    const { result } = renderEditorApi();

    await act(async () => {
      await result.current.editorApi.setContent('test-path', 'test-content 1');
      await result.current.editorApi.setContent('test-path', 'test-content 2');
      await result.current.editorApi.setContent('test-path', 'test-content 3');
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});

describe('editor document binding', () => {
  let host: IEventBus;
  let editor: IEventBus;
  const ref = createRef<SourceCodeBridgeProviderRef>();
  let binding: ReturnType<typeof bindEditorDocument>;
  let content: string;
  const init = {
    reason: 'init',
    fileUri: 'route.camel.yaml',
    content: '',
    readonly: false,
  } as const;

  beforeEach(async () => {
    content = '';
    host = createEventBus({ role: 'host', onError: vi.fn() });
    editor = createEventBus({ role: 'editor', onError: vi.fn() });
    const transports = createMemoryTransports();
    await Promise.all([
      createPostMessageBridge({ bus: host, transport: transports.host }).connect(),
      createPostMessageBridge({ bus: editor, transport: transports.editor }).connect(),
    ]);
    ref.current = {
      setContent: vi.fn(async (_path, next) => {
        content = next;
        binding.notifyChange(next);
      }),
      getContent: vi.fn(async () => content),
    };
    binding = bindEditorDocument(editor, ref);
  });
  afterEach(() => {
    binding?.dispose();
    host.dispose();
    editor.dispose();
  });

  it('reports NOT_READY for a missing ref and for snapshots before init', async () => {
    await expect(host.request('host:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_READY' });
    ref.current = null;
    await expect(host.request('host:document:setContent', init)).rejects.toMatchObject({ code: 'NOT_READY' });
  });

  it('delegates undo to the host with the current revision without emitting another edit', async () => {
    const changed = vi.fn();
    const apply = vi.fn(async () => null);
    host.on('editor:document:changed', changed);
    host.onRequest('editor:undoRedo:apply', apply);
    await host.request('host:document:setContent', init);
    content = 'edited';
    binding.notifyChange(content);
    await vi.waitFor(() => {
      expect(changed).toHaveBeenCalledOnce();
    });
    changed.mockClear();
    await binding.applyHistory('undo');
    expect(apply).toHaveBeenCalledWith({ command: 'undo', revision: 1 }, expect.anything());
    expect(content).toBe('edited');
    await host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: '' });
    expect(content).toBe('');
    expect(changed).not.toHaveBeenCalled();
  });

  it('releases the busy state after a host history failure', async () => {
    const apply = vi.fn(async () => {
      throw new BridgeError('NOT_READY', 'Another document is active');
    });
    host.onRequest('editor:undoRedo:apply', apply);
    await host.request('host:document:setContent', init);
    await expect(binding.applyHistory('undo')).rejects.toMatchObject({ code: 'NOT_READY' });
    expect(binding.getState().historyPending).toBe(false);
    expect(content).toBe('');
  });

  it('publishes the first edit after empty init once and suppresses host changes', async () => {
    const changed = vi.fn();
    host.on('editor:document:changed', changed);
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
    content = 'first edit';
    binding.notifyChange(content);
    binding.notifyChange(content);
    await expect(host.request('host:document:getContent', null)).resolves.toEqual({ content, revision: 1 });
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
    content = 'newer';
    binding.notifyChange(content);
    await expect(host.request('host:document:setContent', init)).resolves.toEqual({ applied: false, revision: 1 });
    expect(ref.current!.setContent).toHaveBeenCalledTimes(1);
    expect(content).toBe('newer');
  });

  it('applies authoritative updates even when their text matches an older edit', async () => {
    await host.request('host:document:setContent', init);
    content = 'A';
    binding.notifyChange(content);
    content = 'B';
    binding.notifyChange(content);
    await expect(
      host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'A' }),
    ).resolves.toEqual({ applied: true, revision: 3 });
    expect(content).toBe('A');
  });

  it('serializes content updates and snapshots', async () => {
    await host.request('host:document:setContent', init);
    const pendingWrite = deferred<void>();
    vi.mocked(ref.current!.setContent).mockImplementationOnce(async (_path, next) => {
      await pendingWrite.promise;
      content = next;
    });
    const write = host.request('host:document:setContent', {
      reason: 'hostUpdate',
      fileUri: init.fileUri,
      content: 'queued',
    });
    const snapshot = host.request('host:document:getContent', null);
    await vi.waitFor(() => {
      expect(ref.current!.setContent).toHaveBeenCalledTimes(2);
    });
    pendingWrite.resolve();
    await write;
    await expect(snapshot).resolves.toEqual({ content: 'queued', revision: 1 });
  });

  it('keeps initialization disabled after a failed load and permits a deliberate retry', async () => {
    vi.mocked(ref.current!.setContent).mockRejectedValueOnce(new BridgeError('IO_ERROR', 'read failed'));
    await expect(host.request('host:document:setContent', init)).rejects.toMatchObject({ code: 'IO_ERROR' });
    expect(binding.getState().initialized).toBe(false);
    expect(binding.getState().error).toMatchObject({ message: 'read failed' });
    binding.dispose();
    binding = bindEditorDocument(editor, ref);
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

  it('does not time out while applying a slow initial document', async () => {
    vi.useFakeTimers();
    try {
      const applied = deferred<void>();
      vi.mocked(ref.current!.setContent).mockImplementationOnce(async (_path, next) => {
        await applied.promise;
        content = next;
      });
      binding.ready();
      const init$ = host.request('host:document:setContent', init);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(binding.getState().error).toBeUndefined();
      applied.resolve();
      await expect(init$).resolves.toEqual({ applied: true, revision: 0 });
      expect(binding.getState().initialized).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('suspends mutations on disconnect while retaining the content and revision', async () => {
    await host.request('host:document:setContent', init);
    content = 'unsaved';
    binding.notifyChange(content);
    binding.suspend(new BridgeError('NOT_CONNECTED', 'Host disconnected'));
    await expect(
      host.request('host:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'external' }),
    ).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    expect(content).toBe('unsaved');
    expect(binding.getState().initialized).toBe(true);
  });

  it('does not apply an update if disposed while reading the current content', async () => {
    await host.request('host:document:setContent', init);
    const current = deferred<string>();
    vi.mocked(ref.current!.getContent).mockReturnValueOnce(current.promise);
    const update = host.request('host:document:setContent', {
      reason: 'hostUpdate',
      fileUri: init.fileUri,
      content: 'late',
    });
    await vi.waitFor(() => {
      expect(ref.current!.getContent).toHaveBeenCalled();
    });
    binding.dispose();
    current.resolve('');
    await expect(update).rejects.toMatchObject({ code: 'DISPOSED' });
    expect(ref.current!.setContent).toHaveBeenCalledTimes(1);
    expect(content).toBe('');
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
