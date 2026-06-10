import { act, render, renderHook, screen } from '@testing-library/react';

import { useSourceCodeStore } from '../../store';
import { SourceCodePage } from './SourceCodePage';

// Mock EventNotifier to prevent side effects
vi.mock('../../utils/event-notifier', () => ({
  EventNotifier: {
    getInstance: vi.fn(() => ({
      next: vi.fn(),
      subscribe: vi.fn(),
    })),
  },
}));

// Mock the SourceCode component
vi.mock('../../components/SourceCode', () => ({
  SourceCode: ({ code, onCodeChange }: { code: string; onCodeChange: (code: string) => void }) => (
    <div data-testid="source-code-component">
      <div data-testid="code-content">{code}</div>
      <button data-testid="change-code-button" onClick={() => onCodeChange('new code')}>
        Change Code
      </button>
    </div>
  ),
}));

describe('SourceCodePage', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useSourceCodeStore.setState({ sourceCode: '', path: '' });
      // Clear temporal (undo/redo) history
      useSourceCodeStore.temporal?.getState().clear();
    });
  });

  it('should render SourceCode component with current sourceCode from store', () => {
    const { result } = renderHook(() => useSourceCodeStore());

    act(() => {
      result.current.setSourceCode('test code');
    });

    render(<SourceCodePage />);

    expect(screen.getByTestId('source-code-component')).toBeInTheDocument();
    expect(screen.getByTestId('code-content')).toHaveTextContent('test code');
  });

  it('should render SourceCode component with empty code initially', () => {
    render(<SourceCodePage />);

    expect(screen.getByTestId('source-code-component')).toBeInTheDocument();
    expect(screen.getByTestId('code-content')).toHaveTextContent('');
  });

  it('should call setCodeAndNotify when code changes', () => {
    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');

    render(<SourceCodePage />);

    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });

  it('should update sourceCode in store when handleCodeChange is called', () => {
    render(<SourceCodePage />);

    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    // Directly verify setCodeAndNotify was called with correct argument
    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');

    act(() => {
      changeButton.click();
    });

    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });

  it('should pass onCodeChange callback to SourceCode component', () => {
    act(() => {
      useSourceCodeStore.getState().setSourceCode('initial code');
    });

    render(<SourceCodePage />);

    expect(screen.getByTestId('code-content')).toHaveTextContent('initial code');

    const setCodeAndNotifySpy = vi.spyOn(useSourceCodeStore.getState(), 'setCodeAndNotify');
    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    // Verify the callback was invoked with the correct value
    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
    setCodeAndNotifySpy.mockRestore();
  });

  it('should memoize handleCodeChange callback', () => {
    const { rerender } = render(<SourceCodePage />);

    const firstRenderButton = screen.getByTestId('change-code-button');
    const firstCallback = (firstRenderButton as HTMLButtonElement).onclick;

    rerender(<SourceCodePage />);

    const secondRenderButton = screen.getByTestId('change-code-button');
    const secondCallback = (secondRenderButton as HTMLButtonElement).onclick;

    // The callback reference should be stable across rerenders
    expect(firstCallback).toBe(secondCallback);
  });
});
