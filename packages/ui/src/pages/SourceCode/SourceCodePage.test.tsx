import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { editor } from 'monaco-editor';
import type { MockInstance } from 'vitest';

import { useSourceCodeStore } from '../../store';
import { EventNotifier } from '../../utils/event-notifier';
import { SourceCodePage } from './SourceCodePage';

describe('SourceCodePage', () => {
  let createEditorSpy: MockInstance<typeof editor.create>;

  /** Waits for the real Monaco editor rendered by the SourceCode component and returns it */
  const getEditor = async (): Promise<editor.IStandaloneCodeEditor> => {
    // The first editor of a worker also initializes Monaco, which can take a while when every worker is busy
    await waitFor(
      () => {
        expect(createEditorSpy).toHaveBeenCalled();
      },
      { timeout: 5_000 },
    );
    const lastCreated = createEditorSpy.mock.results.at(-1);
    if (lastCreated?.type !== 'return') throw new Error('The Monaco editor was not created');

    // SourceCode focuses the editor once mounted, in the same effects that subscribe to its content changes
    await waitFor(() => {
      expect(lastCreated.value.hasTextFocus()).toBe(true);
    });

    return lastCreated.value;
  };

  /** With empty code the editor shows an upload empty state, leave it to get to the editor */
  const startFromScratch = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start from scratch' }));
  };

  /** Types into the editor, the SourceCode component reports it through `onCodeChange` */
  const changeCode = async (code: string) => {
    const codeEditor = await getEditor();
    act(() => {
      codeEditor.setValue(code);
    });
  };

  beforeEach(() => {
    // Prevent side effects of the `code:updated` notification
    vi.spyOn(EventNotifier.getInstance(), 'next').mockImplementation(() => {});
    // Observe the real Monaco editor instances created by the SourceCode component
    createEditorSpy = vi.spyOn(editor, 'create');

    // Reset the store before each test
    act(() => {
      useSourceCodeStore.setState({ sourceCode: '', path: '' });
      // Clear temporal (undo/redo) history
      useSourceCodeStore.temporal?.getState().clear();
    });
  });

  it('should render SourceCode component with current sourceCode from store', async () => {
    const { result } = renderHook(() => useSourceCodeStore());

    act(() => {
      result.current.setSourceCode('test code');
    });

    render(<SourceCodePage />);

    expect(screen.getByLabelText('Undo change')).toBeInTheDocument();
    expect((await getEditor()).getValue()).toBe('test code');
  });

  it('should render SourceCode component with empty code initially', async () => {
    render(<SourceCodePage />);

    expect(screen.getByLabelText('Undo change')).toBeInTheDocument();
    expect(screen.getByText('Start editing')).toBeInTheDocument();

    startFromScratch();

    expect((await getEditor()).getValue()).toBe('');
  });

  it('should call setCodeAndNotify when code changes', async () => {
    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');

    render(<SourceCodePage />);
    startFromScratch();

    await changeCode('new code');

    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });

  it('should update sourceCode in store when handleCodeChange is called', async () => {
    render(<SourceCodePage />);
    startFromScratch();

    await changeCode('new code');

    expect(useSourceCodeStore.getState().sourceCode).toBe('new code');
    expect(EventNotifier.getInstance().next).toHaveBeenCalledWith('code:updated', {
      code: 'new code',
      path: undefined,
    });
  });

  it('should pass onCodeChange callback to SourceCode component', async () => {
    act(() => {
      useSourceCodeStore.getState().setSourceCode('initial code');
    });

    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');
    render(<SourceCodePage />);

    expect((await getEditor()).getValue()).toBe('initial code');

    await changeCode('new code');

    // Verify the callback was invoked with the correct value
    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });

  it('should memoize handleCodeChange callback', async () => {
    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');
    const { rerender } = render(<SourceCodePage />);
    startFromScratch();
    const firstEditor = await getEditor();

    rerender(<SourceCodePage />);

    // The editor is kept across rerenders and keeps reporting changes through the same callback
    expect(createEditorSpy).toHaveBeenCalledTimes(1);
    expect(await getEditor()).toBe(firstEditor);

    await changeCode('new code');

    expect(setCodeAndNotifySpy).toHaveBeenCalledTimes(1);
    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });
});
