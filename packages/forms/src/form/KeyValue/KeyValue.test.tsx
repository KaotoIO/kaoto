import { fireEvent, render } from '@testing-library/react';
import { KeyValue, KeyValueType } from './KeyValue';

describe('KeyValue', () => {
  const propName = 'testProp';
  let initialModel: KeyValueType;

  beforeEach(() => {
    initialModel = { key1: 'value1', key2: 'value2' };
  });

  it('renders empty key-value with button disabled', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} onChange={onChange} disabled={true} />);

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('renders initial key-value pairs', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    expect(wrapper.getByDisplayValue('key1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('key2')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();
  });

  it('renders initial key-value pairs with button disabled', () => {
    const onChange = jest.fn();
    const wrapper = render(
      <KeyValue propName={propName} initialModel={initialModel} onChange={onChange} disabled={true} />,
    );

    expect(wrapper.getByDisplayValue('key1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('key2')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('adds a new key-value pair', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__add`));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key1: 'value1', key2: 'value2' }));
  });

  it('removes a key-value pair', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__remove__key1`));

    expect(onChange).toHaveBeenCalledWith({ key2: 'value2' });
  });

  it('updates a key', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.change(wrapper.getByDisplayValue('key1'), { target: { value: 'newKey1' } });

    expect(onChange).toHaveBeenCalledWith({ newKey1: 'value1', key2: 'value2' });
  });

  it('updates a value', () => {
    const onChange = jest.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.change(wrapper.getByDisplayValue('value1'), { target: { value: 'newValue1' } });

    expect(onChange).toHaveBeenCalledWith({ key1: 'newValue1', key2: 'value2' });
  });
});
