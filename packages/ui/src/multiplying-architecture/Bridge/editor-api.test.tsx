import { act, renderHook } from '@testing-library/react';
import { createRef } from 'react';

import {
  BridgeError,
  createEventBus,
  createMemoryTransports,
  createPostMessageBridge,
  type IEventBus,
} from '../../host-bridge';
import { useSourceCodeStore } from '../../store';
import { EventNotifier } from '../../utils';
import { bindEditorDocument, type SourceCodeBridgeProviderRef, useEditorApi } from './editor-api';

const mockController = {
  fromModel: vi.fn(),
};

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

describe('useEditorApi', () => {
  const mockSetCodeAndNotify = vi.fn();
  let originalSetCodeAndNotify: typeof mockSetCodeAndNotify;

  beforeEach(() => {
    originalSetCodeAndNotify = useSourceCodeStore.getState().setCodeAndNotify as typeof mockSetCodeAndNotify;
    vi.clearAllMocks();
    act(() => {
      useSourceCodeStore.setState({ setCodeAndNotify: mockSetCodeAndNotify });
    });
  });

  afterEach(() => {
    act(() => {
      useSourceCodeStore.setState({ setCodeAndNotify: originalSetCodeAndNotify });
    });
  });

  it('should initialize editorApi and sourceCodeRef', () => {
    const { result } = renderHook(() => useEditorApi());

    expect(result.current.editorApi).toBeDefined();
    expect(result.current.sourceCodeRef.current).toBe('');
  });

  it('should set content when setContent is called', async () => {
    const { result } = renderHook(() => useEditorApi());

    const path = 'test-path';
    const content = 'test-content';

    await act(async () => {
      await result.current.editorApi.setContent(path, content);
    });

    expect(mockSetCodeAndNotify).toHaveBeenCalledWith(content, path);
    expect(result.current.sourceCodeRef.current).toBe(content);
  });

  it('should not update content if the new content is the same as the current one', async () => {
    const { result } = renderHook(() => useEditorApi());

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
    const { result } = renderHook(() => useEditorApi());

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

  it('should return undefined for getPreview', async () => {
    const { result } = renderHook(() => useEditorApi());

    const preview = await result.current.editorApi.getPreview();

    expect(preview).toBeUndefined();
  });

  it('should clear pastState when loading the store for the first time', async () => {
    const clearSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'clear');

    const { result } = renderHook(() => useEditorApi());

    await act(async () => {
      await result.current.editorApi.setContent('test-path', 'test-content 1');
      await result.current.editorApi.setContent('test-path', 'test-content 2');
      await result.current.editorApi.setContent('test-path', 'test-content 3');
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should call undo when the editor is asked to undo', async () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');
    const storeUndoSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'undo');

    const { result } = renderHook(() => useEditorApi());

    await act(async () => {
      await result.current.editorApi.undo();
    });

    expect(mockController.fromModel).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', expect.objectContaining({ code: '' }));
    expect(storeUndoSpy).toHaveBeenCalled();
  });

  it('should call redo when the editor is asked to redo', async () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');
    const storeRedoSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'redo');

    const { result } = renderHook(() => useEditorApi());

    await act(async () => {
      await result.current.editorApi.redo();
    });

    expect(mockController.fromModel).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', expect.objectContaining({ code: '' }));
    expect(storeRedoSpy).toHaveBeenCalled();
  });

  it('should validate and return an empty array', async () => {
    const { result } = renderHook(() => useEditorApi());

    const validationResult = await result.current.editorApi.validate();

    expect(validationResult).toEqual([]);
  });

  it('should resolve setTheme without errors', async () => {
    const { result } = renderHook(() => useEditorApi());

    await expect(result.current.editorApi.setTheme('light')).resolves.toBeUndefined();
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
    isDirty: null,
    readonly: false,
    saveAcknowledgements: false,
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
      getPreview: vi.fn(async () => undefined),
      validate: vi.fn(async () => []),
      undo: vi.fn(async () => {
        content = 'undo';
        binding.notifyChange(content);
      }),
      redo: vi.fn(async () => {
        content = 'redo';
        binding.notifyChange(content);
      }),
      setTheme: vi.fn(async () => {}),
    };
    binding = bindEditorDocument(editor, ref);
  });
  afterEach(() => {
    binding?.dispose();
    host.dispose();
    editor.dispose();
  });

  it('reports NOT_READY for a missing ref and for snapshots before init', async () => {
    await expect(host.request('editor:document:getContent', null)).rejects.toMatchObject({ code: 'NOT_READY' });
    ref.current = null;
    await expect(host.request('editor:document:setContent', init)).rejects.toMatchObject({ code: 'NOT_READY' });
  });

  it('delegates native undo with the current revision without emitting another edit', async () => {
    const changed = vi.fn();
    const apply = vi.fn(async () => null);
    host.on('editor:document:changed', changed);
    host.onRequest('host:undoRedo:apply', apply);
    await host.request('editor:document:setContent', { ...init, nativeUndoRedo: true });
    content = 'edited';
    binding.notifyChange(content);
    await vi.waitFor(() => {
      expect(changed).toHaveBeenCalledOnce();
    });
    changed.mockClear();
    await binding.applyHistory('undo');
    expect(apply).toHaveBeenCalledWith({ command: 'undo', revision: 1 }, expect.anything());
    expect(ref.current!.undo).not.toHaveBeenCalled();
    expect(content).toBe('edited');
    await host.request('editor:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: '' });
    expect(content).toBe('');
    expect(changed).not.toHaveBeenCalled();
  });

  it('rejects local history requests in native mode and releases busy state after a host failure', async () => {
    const apply = vi.fn(async () => {
      throw new BridgeError('NOT_READY', 'Another document is active');
    });
    host.onRequest('host:undoRedo:apply', apply);
    await host.request('editor:document:setContent', { ...init, nativeUndoRedo: true });
    await expect(host.request('editor:undoRedo:apply', { command: 'undo' })).rejects.toMatchObject({
      code: 'UNSUPPORTED_REQUEST',
    });
    await expect(binding.applyHistory('undo')).rejects.toMatchObject({ code: 'NOT_READY' });
    expect(binding.getState().historyPending).toBe(false);
    expect(ref.current!.undo).not.toHaveBeenCalled();
    expect(content).toBe('');
  });

  it('publishes the first edit after empty init once and suppresses host changes', async () => {
    const changed = vi.fn();
    host.on('editor:document:changed', changed);
    await expect(host.request('editor:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
    content = 'first edit';
    binding.notifyChange(content);
    binding.notifyChange(content);
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({ content, revision: 1 });
    await host.request('editor:document:setContent', {
      reason: 'hostUpdate',
      fileUri: init.fileUri,
      content: 'external',
    });
    expect(changed).toHaveBeenCalledExactlyOnceWith({ content: 'first edit', revision: 1 });
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({
      content: 'external',
      revision: 2,
    });
  });

  it('ignores repeated init and stale save echoes without applying content again', async () => {
    await host.request('editor:document:setContent', init);
    content = 'newer';
    binding.notifyChange(content);
    await expect(host.request('editor:document:setContent', init)).resolves.toEqual({ applied: false, revision: 1 });
    await expect(
      host.request('editor:document:setContent', {
        reason: 'saveEcho',
        fileUri: init.fileUri,
        content: '',
        revision: 0,
      }),
    ).resolves.toEqual({ applied: false, revision: 1 });
    expect(ref.current!.setContent).toHaveBeenCalledTimes(1);
    expect(content).toBe('newer');
  });

  it('applies authoritative updates even when their text matches an older edit', async () => {
    await host.request('editor:document:setContent', init);
    content = 'A';
    binding.notifyChange(content);
    content = 'B';
    binding.notifyChange(content);
    await expect(
      host.request('editor:document:setContent', { reason: 'hostUpdate', fileUri: init.fileUri, content: 'A' }),
    ).resolves.toEqual({ applied: true, revision: 3 });
    expect(content).toBe('A');
  });

  it('serializes content, snapshots, validation, preview and undo/redo', async () => {
    await host.request('editor:document:setContent', init);
    const pendingWrite = deferred<void>();
    vi.mocked(ref.current!.setContent).mockImplementationOnce(async (_path, next) => {
      await pendingWrite.promise;
      content = next;
    });
    const write = host.request('editor:document:setContent', {
      reason: 'hostUpdate',
      fileUri: init.fileUri,
      content: 'queued',
    });
    const snapshot = host.request('editor:document:getContent', null);
    const validation = host.request('editor:document:validate', null);
    const preview = host.request('editor:preview:get', null);
    const undo = host.request('editor:undoRedo:apply', { command: 'undo' });
    await vi.waitFor(() => {
      expect(ref.current!.setContent).toHaveBeenCalledTimes(2);
    });
    expect(ref.current!.validate).not.toHaveBeenCalled();
    expect(ref.current!.undo).not.toHaveBeenCalled();
    pendingWrite.resolve();
    await write;
    await expect(snapshot).resolves.toEqual({ content: 'queued', revision: 1 });
    await expect(validation).resolves.toEqual({ notifications: [] });
    await expect(preview).resolves.toEqual({ svg: null });
    await undo;
    await host.request('editor:undoRedo:apply', { command: 'redo' });
    await expect(host.request('editor:document:getContent', null)).resolves.toEqual({ content: 'redo', revision: 3 });
  });

  it('keeps initialization disabled after a failed load and permits a deliberate retry', async () => {
    vi.mocked(ref.current!.setContent).mockRejectedValueOnce(new BridgeError('IO_ERROR', 'read failed'));
    await expect(host.request('editor:document:setContent', init)).rejects.toMatchObject({ code: 'IO_ERROR' });
    expect(binding.getState().initialized).toBe(false);
    expect(binding.getState().error).toMatchObject({ message: 'read failed' });
    binding.dispose();
    binding = bindEditorDocument(editor, ref);
    await expect(host.request('editor:document:setContent', init)).resolves.toEqual({ applied: true, revision: 0 });
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
    await host.request('editor:document:setContent', init);
    content = 'unsaved';
    binding.notifyChange(content);
    binding.suspend(new BridgeError('NOT_CONNECTED', 'Host disconnected'));
    await expect(host.request('editor:undoRedo:apply', { command: 'undo' })).rejects.toMatchObject({
      code: 'NOT_CONNECTED',
    });
    expect(content).toBe('unsaved');
    expect(binding.getState().initialized).toBe(true);
  });

  it('does not apply an update if disposed while reading the current content', async () => {
    await host.request('editor:document:setContent', init);
    const current = deferred<string>();
    vi.mocked(ref.current!.getContent).mockReturnValueOnce(current.promise);
    const update = host.request('editor:document:setContent', {
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
