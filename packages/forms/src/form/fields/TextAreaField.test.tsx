import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { SuggestionContext } from '../providers/SuggestionRegistryProvider';
import { ROOT_PATH } from '../utils';
import { TextAreaField } from './TextAreaField';

const StatefulSuggestionProvider = ({ children, getProviders }: { children: ReactNode; getProviders: jest.Mock }) => {
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);
  return (
    <SuggestionContext.Provider value={{ getProviders, currentOpenMenu, setCurrentOpenMenu }}>
      {children}
    </SuggestionContext.Provider>
  );
};

describe('TextAreaField', () => {
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
        <TextAreaField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should set 2 rows by default', () => {
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <TextAreaField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('rows', '2');
  });

  it('should set the appropriate amount of rows', () => {
    const model = `Line 1
      Line 2
      Line 3
      Line 4`;

    const wrapper = render(
      <ModelContextProvider model={model} onPropertyChange={jest.fn()}>
        <TextAreaField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('rows', '4');
  });

  it('should set the appropriate placeholder', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
        <SchemaProvider schema={{ type: 'string', default: 'Default Value' }}>
          <TextAreaField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Default Value');
  });

  it('should notify when the value changes', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <TextAreaField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
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
        <TextAreaField propName={ROOT_PATH} />
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

  it('should call the onRemove callback if provided when using the clear button', async () => {
    const onRemoveSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <TextAreaField propName={ROOT_PATH} onRemove={onRemoveSpy} />
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

    expect(onRemoveSpy).toHaveBeenCalledTimes(1);
  });

  it('shows suggestions when Ctrl+Space is pressed', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = renderWithSuggestions(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <TextAreaField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    await act(async () => {
      const input = wrapper.getByRole('textbox');
      input.focus();
      fireEvent.keyDown(input, { code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(wrapper.getByTestId('suggestions-menu')).toBeInTheDocument();
    });

    expect(wrapper.getByRole('menuitem', { name: 'test-suggestion-1' })).toBeInTheDocument();
    expect(wrapper.getByRole('menuitem', { name: 'test-suggestion-2' })).toBeInTheDocument();
  });
});
