import { act, fireEvent, render } from '@testing-library/react';
import { ROOT_PATH } from '../../../../../utils';
import { StringField } from './StringField';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';

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

  it('should notify when the value changes', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <StringField propName={ROOT_PATH} />
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
        <StringField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const fieldActions = wrapper.getByTestId(`${ROOT_PATH}__field-actions`);
    fireEvent.click(fieldActions);

    const clearButton = await wrapper.findByRole('menuitem', { name: /clear/i });
    fireEvent.click(clearButton);

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
