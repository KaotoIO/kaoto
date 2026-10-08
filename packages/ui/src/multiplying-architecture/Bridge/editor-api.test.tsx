import { EditorTheme } from '@kie-tools-core/editor/dist/api';
import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';
import { MockInstance } from 'vitest';

import { useSourceCodeStore } from '../../store';
import { EventNotifier } from '../../utils';
import { useEditorApi } from './editor-api';

describe('useEditorApi', () => {
  const mockSetCodeAndNotify = vi.fn();
  let originalSetCodeAndNotify: typeof mockSetCodeAndNotify;
  let controller: Visualization;
  let fromModelSpy: MockInstance<Visualization['fromModel']>;

  /** Renders the hook inside a real topology controller, used by useUndoRedo */
  const renderEditorApi = () => {
    const wrapper = ({ children }: PropsWithChildren) => createElement(VisualizationProvider, { controller }, children);
    return renderHook(() => useEditorApi(), { wrapper });
  };

  beforeEach(() => {
    controller = new Visualization();
    controller.fromModel({ graph: { id: 'graph', type: 'graph' } });
    fromModelSpy = vi.spyOn(controller, 'fromModel');

    originalSetCodeAndNotify = useSourceCodeStore.getState().setCodeAndNotify as typeof mockSetCodeAndNotify;
    vi.clearAllMocks();
    act(() => {
      /* Start from a pristine store and an empty undo/redo history */
      useSourceCodeStore.setState({ sourceCode: '', path: '', setCodeAndNotify: mockSetCodeAndNotify });
      useSourceCodeStore.temporal.getState().clear();
    });
  });

  afterEach(() => {
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

  it('should get content when getContent is called', async () => {
    const { result } = renderEditorApi();

    const content = 'test-content';
    result.current.sourceCodeRef.current = content;

    const retrievedContent = await result.current.editorApi.getContent();

    expect(retrievedContent).toBe(content);
  });

  it('should return undefined for getPreview', async () => {
    const { result } = renderEditorApi();

    const preview = await result.current.editorApi.getPreview();

    expect(preview).toBeUndefined();
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

  it('should call undo when the editor is asked to undo', async () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');
    const storeUndoSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'undo');

    const { result } = renderEditorApi();

    await act(async () => {
      await result.current.editorApi.undo();
    });

    expect(fromModelSpy).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', expect.objectContaining({ code: '' }));
    expect(storeUndoSpy).toHaveBeenCalled();
  });

  it('should call redo when the editor is asked to redo', async () => {
    const eventNotifierSpy = vi.spyOn(EventNotifier.getInstance(), 'next');
    const storeRedoSpy = vi.spyOn(useSourceCodeStore.temporal.getState(), 'redo');

    const { result } = renderEditorApi();

    await act(async () => {
      await result.current.editorApi.redo();
    });

    expect(fromModelSpy).toHaveBeenCalledWith({
      nodes: [],
      edges: [],
    });
    expect(eventNotifierSpy).toHaveBeenCalledWith('code:updated', expect.objectContaining({ code: '' }));
    expect(storeRedoSpy).toHaveBeenCalled();
  });

  it('should validate and return an empty array', async () => {
    const { result } = renderEditorApi();

    const validationResult = await result.current.editorApi.validate();

    expect(validationResult).toEqual([]);
  });

  it('should resolve setTheme without errors', async () => {
    const { result } = renderEditorApi();

    await expect(result.current.editorApi.setTheme(EditorTheme.LIGHT)).resolves.toBeUndefined();
  });
});
