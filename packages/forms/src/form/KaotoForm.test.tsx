import '@testing-library/jest-dom';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { KaotoForm, KaotoFormApi, KaotoFormProps } from './KaotoForm';
import { KaotoFormPageObject } from './testing/KaotoFormPageObject';

describe('KaotoForm', () => {
  const defaultProps: KaotoFormProps = {
    schema: {
      type: 'object',
      properties: {
        name: { title: 'Name', type: 'string' },
      },
      required: ['name'],
    },
    model: {},
    'data-testid': 'kaoto-form',
  };

  it('renders without crashing', () => {
    render(<KaotoForm {...defaultProps} />);
    expect(screen.getByTestId('kaoto-form')).toBeInTheDocument();
  });

  it('should prevent executing the default onSubmit action', () => {
    const { getByTestId } = render(<KaotoForm {...defaultProps} />);
    const form = getByTestId('kaoto-form');

    const mockEvent = createEvent.submit(form);
    const preventDefaultSpy = jest.spyOn(mockEvent, 'preventDefault');

    act(() => {
      fireEvent(form, mockEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('displays "Schema not defined" when schema is not provided', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs

    expect(() => render(<KaotoForm {...defaultProps} schema={undefined} />)).toThrow('[KaotoForm]: Schema is required');

    jest.restoreAllMocks();
  });

  it('should not call onChange when loading the form for the first time', () => {
    const onChangeMock = jest.fn();
    render(<KaotoForm {...defaultProps} onChange={onChangeMock} />);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('should call onChange when the model changes', async () => {
    const onChangeMock = jest.fn();
    render(<KaotoForm {...defaultProps} onChange={onChangeMock} />);

    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangeMock).toHaveBeenCalledWith({
      name: value,
    });
  });

  it('should call onChangeProp when a property changes', async () => {
    const onChangePropMock = jest.fn();
    render(<KaotoForm {...defaultProps} onChangeProp={onChangePropMock} />);

    const propName = 'name';
    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangePropMock).toHaveBeenCalledWith(propName, value);
  });

  it('should call onChangeProp when a primitive property changes', async () => {
    const onChangePropMock = jest.fn();
    render(<KaotoForm {...defaultProps} model="" onChangeProp={onChangePropMock} />);

    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangePropMock).toHaveBeenCalledWith('name', value);
  });

  it('should validate the model', async () => {
    const wrapper = render(<KaotoFormApiTest />);

    const validateButton = wrapper.getByTestId('validate');
    fireEvent.click(validateButton);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  const KaotoFormApiTest = () => {
    const formRef = useRef<KaotoFormApi>(null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    return (
      <>
        <code>{JSON.stringify(errors, undefined, 2)}</code>
        <KaotoForm {...defaultProps} ref={formRef} />
        <button
          type="button"
          title="validate"
          data-testid="validate"
          onClick={() => {
            const errors = formRef.current?.validate();
            setErrors(errors ?? {});
          }}
        />
      </>
    );
  };
});
