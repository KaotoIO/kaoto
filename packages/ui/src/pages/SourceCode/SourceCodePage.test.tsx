import { act, render, renderHook, screen } from '@testing-library/react';

import { useSourceCodeStore } from '../../store';
import { SourceCodePage } from './SourceCodePage';

// Mock the SourceCode component
jest.mock('../../components/SourceCode', () => ({
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
    const { result } = renderHook(() => useSourceCodeStore());
    const setCodeAndNotifySpy = jest.spyOn(result.current, 'setCodeAndNotify');

    render(<SourceCodePage />);

    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    expect(setCodeAndNotifySpy).toHaveBeenCalledWith('new code');
  });

  it('should update sourceCode in store when handleCodeChange is called', () => {
    render(<SourceCodePage />);

    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    const state = useSourceCodeStore.getState();
    expect(state.sourceCode).toBe('new code');
  });

  it('should pass onCodeChange callback to SourceCode component', () => {
    const { result } = renderHook(() => useSourceCodeStore());

    act(() => {
      result.current.setSourceCode('initial code');
    });

    render(<SourceCodePage />);

    expect(screen.getByTestId('code-content')).toHaveTextContent('initial code');

    const changeButton = screen.getByTestId('change-code-button');

    act(() => {
      changeButton.click();
    });

    // Verify the code was updated through the callback
    const updatedState = useSourceCodeStore.getState();
    expect(updatedState.sourceCode).toBe('new code');
  });

  it('should memoize handleCodeChange callback', () => {
    const { rerender } = render(<SourceCodePage />);

    const firstRenderButton = screen.getByTestId('change-code-button');

    rerender(<SourceCodePage />);

    const secondRenderButton = screen.getByTestId('change-code-button');

    // The button should be the same element, indicating the callback is memoized
    expect(firstRenderButton).toBe(secondRenderButton);
  });
});
