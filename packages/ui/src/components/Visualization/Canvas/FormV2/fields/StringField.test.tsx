import { act, fireEvent, render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { ROOT_PATH } from '../../../../../utils';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { StringField } from './StringField';

describe('StringField', () => {
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
    const stringSchema: KaotoSchemaDefinition['schema'] = { type: 'string' };
    const numberSchema: KaotoSchemaDefinition['schema'] = { type: 'number' };
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

    const clearButton = await wrapper.findByRole('menuitem', { name: /clear/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, undefined);
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

    const clearButton = await wrapper.findByRole('menuitem', { name: /raw/i });
    act(() => {
      fireEvent.click(clearButton);
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

    const raw = await wrapper.findByRole('menuitem', { name: /raw/i });
    act(() => {
      fireEvent.click(raw);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'Test Value');
  });
});
