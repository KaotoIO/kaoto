import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { ReactNode, useState } from 'react';
import { SuggestionContext } from '../providers';
import { ModelContext, ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { ROOT_PATH } from '../utils';
import { StringField } from './StringField';

const StatefulSuggestionProvider = ({ children, getProviders }: { children: ReactNode; getProviders: jest.Mock }) => {
  const [currentOpenMenu, setCurrentOpenMenu] = useState<string | null>(null);
  return (
    <SuggestionContext.Provider value={{ getProviders, currentOpenMenu, setCurrentOpenMenu }}>
      {children}
    </SuggestionContext.Provider>
  );
};

describe('StringField', () => {
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
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should set the appropriate placeholder', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
        <SchemaProvider schema={{ type: 'string', default: 'Default Value' }}>
          <StringField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Default Value');
  });

  describe('onChange', () => {
    const stringSchema: JSONSchema4 = { type: 'string' };
    const numberSchema: JSONSchema4 = { type: 'number' };
    const cases = [
      { initialValue: 'Value', newValue: 'New Value', expectedValue: 'New Value', schema: stringSchema },
      { initialValue: '', newValue: ' ', expectedValue: ' ', schema: stringSchema },
      { initialValue: '', newValue: '123', expectedValue: '123', schema: stringSchema },
      { initialValue: '', newValue: '123', expectedValue: 123, schema: numberSchema },
      { initialValue: '', newValue: '2.', expectedValue: '2.', schema: stringSchema },
      { initialValue: '', newValue: '2.', expectedValue: '2.', schema: numberSchema },
      { initialValue: '', newValue: '2.0', expectedValue: '2.0', schema: stringSchema },
      { initialValue: '', newValue: '2.0', expectedValue: 2, schema: numberSchema },
      { initialValue: '', newValue: '2.05', expectedValue: '2.05', schema: stringSchema },
      { initialValue: '', newValue: '2.05', expectedValue: 2.05, schema: numberSchema },
    ];

    it.each(cases)(
      'should emit `$expectedValue` when the user writes `$newValue`',
      ({ initialValue, newValue, expectedValue, schema }) => {
        const onPropertyChangeSpy = jest.fn();

        const wrapper = render(
          <ModelContextProvider model={initialValue} onPropertyChange={onPropertyChangeSpy}>
            <SchemaProvider schema={schema}>
              <StringField propName={ROOT_PATH} />
            </SchemaProvider>
          </ModelContextProvider>,
        );

        const input = wrapper.getByRole('textbox');
        act(() => {
          fireEvent.change(input, { target: { value: newValue } });
        });

        expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
        expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, expectedValue);
      },
    );
  });

  it('should clear the input when using the clear button', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
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
        <StringField propName={ROOT_PATH} onRemove={onRemoveSpy} />
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
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const errorMessage = wrapper.getByText('error message');
    expect(errorMessage).toBeInTheDocument();
  });

  it('wraps value with RAW when Raw button is clicked', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const rawButton = await wrapper.findByTestId(`${ROOT_PATH}__toRaw`);
    act(() => {
      fireEvent.click(rawButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'RAW(Value)');
  });

  it('unwraps value from RAW when already wrapped', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="RAW(Test Value)" onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const raw = await wrapper.findByTestId(`${ROOT_PATH}__toRaw`);
    act(() => {
      fireEvent.click(raw);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'Test Value');
  });

  it('should show additional utility if provided', () => {
    const additionalUtility = <span data-testid="additional-utility">Utility</span>;
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <StringField propName={ROOT_PATH} additionalUtility={additionalUtility} />
      </ModelContextProvider>,
    );

    expect(wrapper.getByTestId('additional-utility')).toBeInTheDocument();
  });

  it('should not wrap non-string values with RAW', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model={123} onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    act(() => {
      fireEvent.click(fieldActions);
    });

    const rawButton = await wrapper.findByTestId(`${ROOT_PATH}__toRaw`);
    act(() => {
      fireEvent.click(rawButton);
    });

    expect(onPropertyChangeSpy).not.toHaveBeenCalled();
  });

  it('should handle integer schema type', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <SchemaProvider schema={{ type: 'integer' }}>
          <StringField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    act(() => {
      fireEvent.change(input, { target: { value: '42' } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 42);
  });

  it('should set field type correctly', () => {
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <StringField propName={ROOT_PATH} fieldType="password" />
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should handle disabled state', () => {
    const wrapper = render(
      <ModelContext.Provider value={{ disabled: true, model: 'value', onPropertyChange: jest.fn() }}>
        <StringField propName={ROOT_PATH} />
      </ModelContext.Provider>,
    );

    const inputField = wrapper.getByRole('textbox');
    expect(inputField).toBeDisabled();
  });

  it('should handle empty string conversion for number schema', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model=" " onPropertyChange={onPropertyChangeSpy}>
        <SchemaProvider schema={{ type: 'number' }}>
          <StringField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    act(() => {
      fireEvent.change(input, { target: { value: '' } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, '');
  });

  it('should handle NaN values for number schema', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <SchemaProvider schema={{ type: 'number' }}>
          <StringField propName={ROOT_PATH} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

    const input = wrapper.getByRole('textbox');
    act(() => {
      fireEvent.change(input, { target: { value: 'invalid-number' } });
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'invalid-number');
  });

  it('should show suggestions when Ctrl+Space is pressed', async () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = renderWithSuggestions(
      <ModelContextProvider model="" onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
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
        <StringField propName={ROOT_PATH} />
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
