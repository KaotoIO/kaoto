import { fireEvent, render } from '@testing-library/react';
import { IndexedValue, KeyValueType } from './IndexedValue';

describe('IndexedValue', () => {
  const propName = 'testProp';
  let initialModel: KeyValueType;

  beforeEach(() => {
    initialModel = { 0: 'value1', 3: 'value2', 5: 'value3' };
  });

  it('renders empty key-value with button disabled', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} onChange={onChange} disabled={true} />);

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('renders initial key-value pairs', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    expect(wrapper.getByText('0')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByText('1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();
    expect(wrapper.getByText('2')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value3')).toBeInTheDocument();
  });

  it('renders initial key-value pairs with button disabled', () => {
    const onChange = jest.fn();
    const wrapper = render(
      <IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} disabled={true} />,
    );

    expect(wrapper.getByText('0')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByText('1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('adds a new key-value pair', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__add`));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ 0: 'value1', 1: 'value2', 2: 'value3', 3: '' }));
  });

  it('adds a new duplicate key-value pair', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} />);
    expect(wrapper.getByText('0')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();

    // currently tere are 3 elemeents but index 3 is already used
    fireEvent.click(wrapper.getByTestId(`${propName}__add`));

    //expected behaviour is to have the new element added at the end with index 3 and reindex the rest
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ 0: 'value1', 1: 'value2', 2: 'value3', 3: '' }));
  });

  it('removes a key-value pair', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__remove__1`));

    expect(onChange).toHaveBeenCalledWith({ '0': 'value1', 1: 'value3' });
  });

  it('updates a value', () => {
    const onChange = jest.fn();
    const wrapper = render(<IndexedValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.change(wrapper.getByDisplayValue('value1'), { target: { value: 'newValue1' } });

    // also reindexes the keys
    expect(onChange).toHaveBeenCalledWith({ 0: 'newValue1', 1: 'value2', 2: 'value3' });
  });
});
