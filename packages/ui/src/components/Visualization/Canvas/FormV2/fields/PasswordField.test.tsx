import { act, fireEvent, render } from '@testing-library/react';
import { ROOT_PATH } from '../../../../../utils';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaProvider } from '../providers/SchemaProvider';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
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

    const input = wrapper.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Default Value');
  });

  it('should notify when the value changes', () => {
    const onPropertyChangeSpy = jest.fn();

    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={onPropertyChangeSpy}>
        <PasswordField propName={ROOT_PATH} />
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
        <PasswordField propName={ROOT_PATH} />
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

    const clearButton = await wrapper.findByRole('menuitem', { name: /remove/i });
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

    const input = wrapper.getByRole('textbox');

    expect(input.getAttribute('type')).toBe('password');
  });

  it('should toggle the password visibility', () => {
    const wrapper = render(
      <ModelContextProvider model="Value" onPropertyChange={jest.fn()}>
        <PasswordField propName={ROOT_PATH} />
      </ModelContextProvider>,
    );

    const toggleButton = wrapper.getByTestId(`${ROOT_PATH}__toggle-visibility`);
    act(() => {
      fireEvent.click(toggleButton);
    });

    const input = wrapper.getByRole('textbox');

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

    const rawItem = await wrapper.findByRole('menuitem', { name: /raw/i });
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

    const rawItem = await wrapper.findByRole('menuitem', { name: /raw/i });
    act(() => {
      fireEvent.click(rawItem);
    });

    expect(onPropertyChangeSpy).toHaveBeenCalledTimes(1);
    expect(onPropertyChangeSpy).toHaveBeenCalledWith(ROOT_PATH, 'SecretPassword');
  });
});
