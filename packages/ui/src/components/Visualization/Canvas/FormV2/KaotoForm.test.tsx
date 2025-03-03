import { act, render, screen } from '@testing-library/react';
import { KaotoForm, KaotoFormProps } from './KaotoForm';
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

  it('displays "Schema not defined" when schema is not provided', () => {
    render(<KaotoForm {...defaultProps} schema={undefined} />);
    expect(screen.getByText('Schema not defined')).toBeInTheDocument();
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

  it('calls onChangeProp when a property changes', async () => {
    const onChangePropMock = jest.fn();
    render(<KaotoForm {...defaultProps} onChangeProp={onChangePropMock} />);

    const propName = 'name';
    const value = 'new value';

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Name', value);

    expect(onChangePropMock).toHaveBeenCalledWith(propName, value);
  });
});
