import { FunctionComponent, PropsWithChildren } from 'react';
import { SourceCodeApiContext } from '../../providers/source-code.provider';
import { act, renderHook } from '@testing-library/react';
import { useEditorApi } from './editor-api';
import { EditorTheme } from '@kie-tools-core/editor/dist/api';

describe('useEditorApi', () => {
  const mockSetCodeAndNotify = jest.fn();

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <SourceCodeApiContext.Provider value={{ setCodeAndNotify: mockSetCodeAndNotify }}>
      {children}
    </SourceCodeApiContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize editorApi and sourceCodeRef', () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    expect(result.current.editorApi).toBeDefined();
    expect(result.current.sourceCodeRef.current).toBe('');
  });

  it('should set content when setContent is called', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    const path = 'test-path';
    const content = 'test-content';

    await act(async () => {
      await result.current.editorApi.setContent(path, content);
    });

    expect(mockSetCodeAndNotify).toHaveBeenCalledWith(content, path);
    expect(result.current.sourceCodeRef.current).toBe(content);
  });

  it('should not update content if the new content is the same as the current one', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

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
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    const content = 'test-content';
    result.current.sourceCodeRef.current = content;

    const retrievedContent = await result.current.editorApi.getContent();

    expect(retrievedContent).toBe(content);
  });

  it('should return undefined for getPreview', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    const preview = await result.current.editorApi.getPreview();

    expect(preview).toBeUndefined();
  });

  it('should resolve undo and redo without errors', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    await expect(result.current.editorApi.undo()).resolves.toBeUndefined();
    await expect(result.current.editorApi.redo()).resolves.toBeUndefined();
  });

  it('should validate and return an empty array', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    const validationResult = await result.current.editorApi.validate();

    expect(validationResult).toEqual([]);
  });

  it('should resolve setTheme without errors', async () => {
    const { result } = renderHook(() => useEditorApi(), { wrapper });

    await expect(result.current.editorApi.setTheme(EditorTheme.LIGHT)).resolves.toBeUndefined();
  });
});
