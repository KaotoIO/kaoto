import { EditorTheme } from '@kie-tools-core/editor/dist/api';
import { act, renderHook } from '@testing-library/react';

import { useSourceCodeStore } from '../../store';
import { EventNotifier } from '../../utils';
import { useEditorApi } from './editor-api';

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

  it('should get content when getContent is called', async () => {
    const { result } = renderHook(() => useEditorApi());

    const content = 'test-content';
    result.current.sourceCodeRef.current = content;

    const retrievedContent = await result.current.editorApi.getContent();

    expect(retrievedContent).toBe(content);
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

    await expect(result.current.editorApi.setTheme(EditorTheme.LIGHT)).resolves.toBeUndefined();
  });
});
