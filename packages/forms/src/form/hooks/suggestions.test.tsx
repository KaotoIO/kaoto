import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { SuggestionProvider } from '../models/suggestions';
import { SuggestionContext } from '../providers';
import { useSuggestions } from './suggestions';

const StatefulSuggestionProvider = ({ children, getProviders }: { children: ReactNode; getProviders: vi.Mock }) => {
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);
  return (
    <SuggestionContext.Provider value={{ getProviders, currentOpenMenu, setCurrentOpenMenu }}>
      {children}
    </SuggestionContext.Provider>
  );
};

describe('useSuggestions', () => {
  let setValueMock: vi.Mock;
  let mockProvider: SuggestionProvider;
  let getProvidersMock: vi.Mock;

  const TestComponent = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState<string | number>('');

    const { suggestionsMenu } = useSuggestions({
      propName: 'testProp',
      schema: { type: 'string' },
      value,
      setValue: (value) => {
        setValue(value);
        setValueMock(value);
      },
      inputRef,
    });

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="test-input"
          aria-label="Test input"
        />

        {suggestionsMenu}

        <button type="button">Secondary focus</button>
      </>
    );
  };

  const renderWithContext = (children: ReactNode) => {
    return render(<StatefulSuggestionProvider getProviders={getProvidersMock}>{children}</StatefulSuggestionProvider>);
  };

  beforeEach(() => {
    setValueMock = vi.fn();
    getProvidersMock = vi.fn();

    mockProvider = {
      id: 'test-provider',
      appliesTo: vi.fn().mockReturnValue(true),
      getSuggestions: vi.fn().mockResolvedValue([
        { value: 'suggestion1', description: 'First suggestion' },
        { value: 'suggestion2', description: 'Second suggestion', group: 'group1' },
      ]),
    };

    getProvidersMock.mockReturnValue([mockProvider]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should not render anything if not visible', async () => {
    const inputElement = document.createElement('input');
    const inputRef = { current: inputElement };

    const { result } = renderHook(
      () =>
        useSuggestions({
          inputRef,
          propName: 'testProp',
          schema: { type: 'string' },
          value: '',
          setValue: setValueMock,
        }),
      {
        wrapper: ({ children }) => (
          <SuggestionContext.Provider
            value={{ getProviders: getProvidersMock, currentOpenMenu: null, setCurrentOpenMenu: vi.fn() }}
          >
            {children}
          </SuggestionContext.Provider>
        ),
      },
    );

    await waitFor(() => {
      expect(mockProvider.getSuggestions).not.toHaveBeenCalled();
    });

    expect(result.current.suggestionsMenu).toBeNull();
  });

  it('should handle setValue being undefined', () => {
    const propsWithoutSetValue: Parameters<typeof useSuggestions>[0] = {
      propName: 'testProp',
      schema: { type: 'string' },
      value: '',
      inputRef: { current: document.createElement('input') },
    };

    const { result } = renderHook(() => useSuggestions(propsWithoutSetValue), {
      wrapper: ({ children }) => (
        <SuggestionContext.Provider
          value={{ getProviders: getProvidersMock, currentOpenMenu: null, setCurrentOpenMenu: vi.fn() }}
        >
          {children}
        </SuggestionContext.Provider>
      ),
    });

    expect(result.current).toBeDefined();
  });

  it('should not register event listeners if there is no inputRef', async () => {
    const addEventListenerSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener');
    const inputRef = { current: null };

    await act(async () => {
      renderHook(
        () =>
          useSuggestions({
            inputRef,
            propName: 'testProp',
            schema: { type: 'string' },
            value: '',
            setValue: setValueMock,
          }),
        {
          wrapper: ({ children }) => (
            <SuggestionContext.Provider
              value={{ getProviders: getProvidersMock, currentOpenMenu: null, setCurrentOpenMenu: vi.fn() }}
            >
              {children}
            </SuggestionContext.Provider>
          ),
        },
      );
    });

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('should register event listeners immediately when input is already focused', async () => {
    const addEventListenerSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener');

    // Create an input element and focus it before creating the hook
    const inputElement = document.createElement('input');
    document.body.appendChild(inputElement);
    inputElement.focus();

    // Verify the input is focused
    expect(document.activeElement).toBe(inputElement);

    const inputRef = { current: inputElement };

    await act(async () => {
      renderHook(
        () =>
          useSuggestions({
            inputRef,
            propName: 'testProp',
            schema: { type: 'string' },
            value: '',
            setValue: setValueMock,
          }),
        {
          wrapper: ({ children }) => (
            <SuggestionContext.Provider
              value={{ getProviders: getProvidersMock, currentOpenMenu: null, setCurrentOpenMenu: vi.fn() }}
            >
              {children}
            </SuggestionContext.Provider>
          ),
        },
      );
    });

    // Verify that addEventListener was called immediately because input was already focused
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    // Clean up
    document.body.removeChild(inputElement);
    addEventListenerSpy.mockRestore();
  });

  it('should cleanup event listeners when input ref changes', () => {
    const addEventListenerSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(HTMLInputElement.prototype, 'removeEventListener');

    const props: Parameters<typeof useSuggestions>[0] = {
      propName: 'testProp',
      schema: { type: 'string' },
      value: '',
      setValue: setValueMock,
      inputRef: { current: document.createElement('input') },
    };

    const { rerender } = renderHook(() => useSuggestions(props), {
      wrapper: ({ children }) => (
        <SuggestionContext.Provider
          value={{ getProviders: getProvidersMock, currentOpenMenu: null, setCurrentOpenMenu: vi.fn() }}
        >
          {children}
        </SuggestionContext.Provider>
      ),
    });

    expect(addEventListenerSpy).toHaveBeenCalled();

    // Change input ref
    props.inputRef = { current: document.createElement('input') };
    rerender();

    expect(removeEventListenerSpy).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should handle keyboard events only when input is focused', async () => {
    const result = renderWithContext(<TestComponent />);

    expect(result.queryByText('suggestion1')).not.toBeInTheDocument();

    await act(async () => {
      const button = result.getByRole('button', { name: 'Secondary focus' });
      fireEvent.focus(button);
      fireEvent.keyDown(button, { ctrlKey: true, code: 'Space' });
    });

    await waitFor(() => {
      expect(result.queryByText('suggestion1')).not.toBeInTheDocument();
    });
  });

  it('should show suggestions menu when pressing Ctrl+Space', async () => {
    const result = renderWithContext(<TestComponent />);

    expect(result.queryByTestId('suggestion-menu')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
    });

    await waitFor(() => {
      expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
    });
  });

  describe('Escape key handling', () => {
    it('should hide suggestions menu when Escape is pressed', async () => {
      const result = renderWithContext(<TestComponent />);

      await act(async () => {
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.focus(result.getByTestId('test-input'));
        fireEvent.keyDown(result.getByTestId('test-input'), { key: 'Escape' });
      });

      await waitFor(() => {
        expect(result.queryByTestId('suggestions-menu')).not.toBeInTheDocument();
      });
    });

    it('should hide suggestions menu when Escape is pressed in the search field', async () => {
      const result = renderWithContext(<TestComponent />);

      await act(async () => {
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
      });

      await act(async () => {
        const searchInput = result.getByRole('searchbox');
        expect(searchInput).toBeInTheDocument();

        fireEvent.focus(searchInput!);
        fireEvent.keyDown(searchInput!, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(result.queryByTestId('suggestions-menu')).not.toBeInTheDocument();
      });
    });

    it('should return the focus to the input when pressing Escape', async () => {
      const result = renderWithContext(<TestComponent />);

      const input = result.getByRole('textbox');
      const focusSpy = vi.spyOn(input, 'focus');

      // Open suggestions menu
      await act(async () => {
        fireEvent.focus(input);
        fireEvent.keyDown(input, { ctrlKey: true, code: 'Space' });
      });

      // Press Escape to close suggestions
      await act(async () => {
        const suggestionItem = result.getByText('suggestion1');
        fireEvent.keyDown(suggestionItem, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(focusSpy).toHaveBeenCalled();
      });
    });
  });

  it('should fetch suggestions from providers when value changes', async () => {
    const result = renderWithContext(<TestComponent />);

    await act(async () => {
      fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
    });

    await waitFor(() => {
      expect(mockProvider.getSuggestions).toHaveBeenCalledTimes(1);
      expect(mockProvider.getSuggestions).toHaveBeenCalledWith('', {
        cursorPosition: 0,
        inputValue: '',
        propertyName: 'testProp',
      });
    });

    await act(async () => {
      fireEvent.change(result.getByTestId('test-input'), { target: { value: 'new value' } });
    });

    await waitFor(() => {
      expect(mockProvider.getSuggestions).toHaveBeenCalledTimes(2);
      expect(mockProvider.getSuggestions).toHaveBeenCalledWith('value', {
        cursorPosition: 9,
        inputValue: 'new value',
        propertyName: 'testProp',
      });
    });
  });

  it('should select an option and return to the input when clicking on it', async () => {
    const result = renderWithContext(<TestComponent />);

    const input = result.getByRole('textbox') as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    const selectionRangeSpy = vi.spyOn(input, 'setSelectionRange');

    // Open suggestions menu
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.keyDown(input, { ctrlKey: true, code: 'Space' });
    });

    await act(async () => {
      const suggestionItem = result.getByText('suggestion1');
      fireEvent.click(suggestionItem);
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(selectionRangeSpy).toHaveBeenCalled();
  });

  it('should select an option when pressing Enter', async () => {
    const result = renderWithContext(<TestComponent />);

    const input = result.getByRole('textbox') as HTMLInputElement;
    const focusSpy = vi.spyOn(input, 'focus');
    const selectionRangeSpy = vi.spyOn(input, 'setSelectionRange');

    // Open suggestions menu
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.keyDown(input, { ctrlKey: true, code: 'Space' });
    });

    await act(async () => {
      const suggestionItem = result.getByText('suggestion1');
      fireEvent.keyDown(suggestionItem, { key: 'Enter' });
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(selectionRangeSpy).toHaveBeenCalled();
  });

  it('should group suggestions correctly', async () => {
    mockProvider.getSuggestions = vi.fn().mockResolvedValue([
      { value: 'root1', description: 'Root suggestion' },
      { value: 'grouped1', description: 'Grouped suggestion', group: 'TestGroup' },
      { value: 'grouped2', description: 'Another grouped suggestion', group: 'TestGroup' },
    ]);

    const result = renderWithContext(<TestComponent />);

    await act(async () => {
      fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
    });

    await waitFor(() => {
      expect(result.getByText('root1')).toBeInTheDocument();
      expect(result.getByText('TestGroup')).toBeInTheDocument();
    });
  });

  describe('when no suggestions are available', () => {
    it('should show "No suggestions available" when no suggestions are provided', async () => {
      mockProvider.getSuggestions = vi.fn().mockResolvedValue([]);

      const result = renderWithContext(<TestComponent />);
      await act(async () => {
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByText('No suggestions available')).toBeInTheDocument();
      });
    });

    it('should not show "No suggestions available" when there are grouped suggestions', async () => {
      mockProvider.getSuggestions = vi
        .fn()
        .mockResolvedValue([{ value: 'grouped1', description: 'Grouped suggestion', group: 'TestGroup' }]);

      const result = renderWithContext(<TestComponent />);
      await act(async () => {
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.queryByText('No suggestions available')).not.toBeInTheDocument();
        expect(result.getByText('TestGroup')).toBeInTheDocument();
      });
    });

    it('should not render empty groups', async () => {
      mockProvider.getSuggestions = vi.fn().mockResolvedValue([
        { value: 'root1', description: 'Root suggestion' },
        { value: 'grouped1', description: 'Grouped suggestion', group: 'TestGroup' },
      ]);

      const result = renderWithContext(<TestComponent />);

      await act(async () => {
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByText('root1')).toBeInTheDocument();
        expect(result.getByText('TestGroup')).toBeInTheDocument();
      });

      // Filter suggestions to make TestGroup empty
      await act(async () => {
        const searchInput = result.getByRole('searchbox');
        fireEvent.change(searchInput!, { target: { value: 'root' } });
      });

      await waitFor(() => {
        expect(result.getByText('root1')).toBeInTheDocument();
        expect(result.queryByText('TestGroup')).not.toBeInTheDocument();
      });
    });
  });

  it('should handle async suggestion providers', async () => {
    const asyncProvider: SuggestionProvider = {
      id: 'async-provider',
      appliesTo: vi.fn().mockReturnValue(true),
      getSuggestions: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve([{ value: 'async-suggestion' }]), 1_000)),
        ),
    };
    getProvidersMock.mockReturnValue([asyncProvider]);
    vi.useFakeTimers();

    const result = renderWithContext(<TestComponent />);
    await act(async () => {
      fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
    });

    expect(result.queryByTestId('async-suggestion')).not.toBeInTheDocument();

    // Advance fake timers and flush all pending async work
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should eventually show async suggestions
    expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
  });

  it('should apply suggestion when clicked', async () => {
    const result = renderWithContext(<TestComponent />);

    await act(async () => {
      fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
    });

    await act(async () => {
      fireEvent.click(result.getByRole('menuitem', { name: 'suggestion1' }));
    });

    await waitFor(() => {
      expect(result.queryByTestId('suggestions-menu')).not.toBeInTheDocument();
      expect(setValueMock).toHaveBeenCalledWith('suggestion1');

      const inputElement = result.getByTestId('test-input') as HTMLInputElement;
      expect(inputElement.value).toBe('suggestion1');
    });
  });

  describe('search functionality', () => {
    it('should filter suggestions based on search input', async () => {
      const result = renderWithContext(<TestComponent />);

      // Open suggestions menu
      await act(async () => {
        fireEvent.focus(result.getByTestId('test-input'));
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
      });

      // Type in the search input to filter
      await act(async () => {
        const searchInput = result.getByRole('searchbox');
        expect(searchInput).toBeInTheDocument();

        fireEvent.change(searchInput!, { target: { value: '2' } });
      });

      await waitFor(() => {
        expect(result.getByText('group1')).toBeInTheDocument();
        expect(result.queryByRole('menuitem', { name: 'suggestion1' })).not.toBeInTheDocument();
      });
    });

    it('should auto-focus the search input when menu opens', async () => {
      const result = renderWithContext(<TestComponent />);

      // Open suggestions menu
      await act(async () => {
        fireEvent.focus(result.getByTestId('test-input'));
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
      });

      await waitFor(() => {
        const searchInput = result.getByRole('searchbox');
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should clear the search input when Ctrl+Space is pressed', async () => {
      const result = renderWithContext(<TestComponent />);

      // Open suggestions menu
      await act(async () => {
        fireEvent.focus(result.getByTestId('test-input'));
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect(result.getByTestId('suggestions-menu')).toBeInTheDocument();
      });

      const searchInput = result.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();

      await act(async () => {
        fireEvent.change(searchInput!, { target: { value: 'new search' } });
      });

      await waitFor(() => {
        expect((searchInput as HTMLInputElement).value).toBe('new search');
      });

      await act(async () => {
        fireEvent.keyDown(searchInput!, { code: 'Escape' });
      });

      // Open suggestions menu
      await act(async () => {
        fireEvent.focus(result.getByTestId('test-input'));
        fireEvent.keyDown(result.getByTestId('test-input'), { ctrlKey: true, code: 'Space' });
      });

      await waitFor(() => {
        expect((searchInput as HTMLInputElement).value).toBe('');
      });
    });
  });
});
