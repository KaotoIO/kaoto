import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { SuggestionContext } from '../providers/SuggestionRegistryProvider';
import { ROOT_PATH } from '../utils';
import { PasswordField } from './PasswordField';

const StatefulSuggestionProvider = ({ children, getProviders }: { children: ReactNode; getProviders: jest.Mock }) => {
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);
  return (
    <SuggestionContext.Provider value={{ getProviders, currentOpenMenu, setCurrentOpenMenu }}>
      {children}
    </SuggestionContext.Provider>
  );
};

describe('PasswordField', () => {
  const mockSuggestionProvider = {
    id: 'test-provider',
    appliesTo: jest.fn().mockReturnValue(true),
    getSuggestions: jest.fn().mockResolvedValue([
      { value: 'test-suggestion-1', description: 'First test suggestion' },
      { value: 'test-suggestion-2', description: 'Second test suggestion' },
    ]),
  };

  const getProvidersMock = jest.fn().mockReturnValue([mockSuggestionProvider]);

  const renderWithSuggestions = (children: React.ReactNode) => {
    return render(<StatefulSuggestionProvider getProviders={getProvidersMock}>{children}</StatefulSuggestionProvider>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { container } = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should set the appropriate placeholder', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
        <SchemaProvider schema={{ type: 'string', default: 'Default Value' }}>
          <PasswordField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByTestId(ROOT_PATH);
    expect(input).toHaveAttribute('placeholder', 'Default Value');
  });

  it('should notify when the value changes', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const input = wrapper.getByTestId(ROOT_PATH);
    act(() => {
      fireEvent.change(input, { target: { value: 'New Value' } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'New Value');
  });

  it('should clear the input when using the clear button', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const clearButton = await wrapper.findByTestId(`${ROOT_PATH}__clear`);
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
  });

  it('should use onRemoveProps callback if specified when using the clear button', async () => {
    const onPropertyChangeSpy = jest.fn();
    const onRemoveSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} onRemove={onRemoveSpy} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const clearButton = await wrapper.findByTestId(`${ROOT_PATH}__clear`);
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).not.toHaveBeenCalled();
    expect(onRemoveSpy).toHaveBeenCalledTimes(1);
    expect(onRemoveSpy).toHaveBeenCalledWith(ROOT_PATH);
  });

  it('should show errors if available for its property path', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider
        model="Value"
        errors={{ [ROOT_PATH]: ['error message'] }}
        onPropertyChange={onPropertyChangeSpy}
      >
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const errorMessage = wrapper.getByText('error message');
    expect(errorMessage).toBeInTheDocument();
  });

  it('should hide password by default', () => {
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const input = wrapper.getByTestId(ROOT_PATH);

    expect(input.getAttribute('type')).toBe('password');
  });

  it('should toggle the password visibility', () => {
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const toggleButton = wrapper.getByRole('button', { name: /show password/i });
    act(() => {
      fireEvent.click(toggleButton);
    });

    const input = wrapper.getByTestId(ROOT_PATH);

    expect(input.getAttribute('type')).toBe('text');
  });

  it('wraps value with RAW when Raw button is clicked', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="SecretPassword" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const rawItem = await wrapper.findByTestId(`${ROOT_PATH}__toRaw`);
    act(() => {
      fireEvent.click(rawItem);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'RAW(SecretPassword)');
  });

  it('unwraps value from RAW when already wrapped', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="RAW(SecretPassword)" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const rawItem = await wrapper.findByTestId(`${ROOT_PATH}__toRaw`);
    act(() => {
      fireEvent.click(rawItem);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'SecretPassword');
  });

  it('should show suggestions when Ctrl+Space is pressed', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = renderWithSuggestions(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    await act(async () => {
      const input = wrapper.getByTestId(ROOT_PATH);
      input.focus();
      fireEvent.keyDown(input, { code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(wrapper.getByTestId('suggestions-menu')).toBeInTheDocument();
    });

    // Check if suggestions are rendered - Carbon MenuItem uses aria-label
    expect(wrapper.getByRole('menuitem', { name: 'test-suggestion-1' })).toBeInTheDocument();
    expect(wrapper.getByRole('menuitem', { name: 'test-suggestion-2' })).toBeInTheDocument();
  });

  it('should apply suggestion when clicked', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = renderWithSuggestions(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    await act(async () => {
      const input = wrapper.getByTestId(ROOT_PATH);
      input.focus();
      fireEvent.keyDown(input, { code: 'Space', ctrlKey: true });
    });

    const suggestionMenu = await wrapper.findByRole('menu');
    expect(suggestionMenu).toBeInTheDocument();

    const firstSuggestion = wrapper.getByRole('menuitem', { name: 'test-suggestion-1' });
    act(() => {
      fireEvent.click(firstSuggestion);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'test-suggestion-1');
  });
});
