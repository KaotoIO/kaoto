import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { KeyValue, KeyValueType } from './KeyValue';

describe('KeyValue', () => {
  const propName = 'testProp';
  let initialModel: KeyValueType;

  beforeEach(() => {
    initialModel = { key1: 'value1', key2: 'value2' };
  });

  it('renders empty key-value with button disabled', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} onChange={onChange} disabled />);

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('renders initial key-value pairs', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    expect(wrapper.getByDisplayValue('key1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('key2')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();
  });

  it('renders initial key-value pairs with button disabled', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} disabled />);

    expect(wrapper.getByDisplayValue('key1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value1')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('key2')).toBeInTheDocument();
    expect(wrapper.getByDisplayValue('value2')).toBeInTheDocument();

    expect(wrapper.getByTestId(`${propName}__add`)).toBeDisabled();
  });

  it('adds a new key-value pair', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__add`));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key1: 'value1', key2: 'value2' }));
  });

  it('removes a key-value pair', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.click(wrapper.getByTestId(`${propName}__remove__key1`));

    expect(onChange).toHaveBeenCalledWith({ key2: 'value2' });
  });

  it('updates a key', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.change(wrapper.getByDisplayValue('key1'), { target: { value: 'newKey1' } });

    expect(onChange).toHaveBeenCalledWith({ newKey1: 'value1', key2: 'value2' });
  });

  it('updates a value', () => {
    const onChange = vi.fn();
    const wrapper = render(<KeyValue propName={propName} initialModel={initialModel} onChange={onChange} />);

    fireEvent.change(wrapper.getByDisplayValue('value1'), { target: { value: 'newValue1' } });

    expect(onChange).toHaveBeenCalledWith({ key1: 'newValue1', key2: 'value2' });
  });

  it('should update displayed entries when initialModel prop changes externally', () => {
    const onChangeMock = vi.fn();

    const { rerender } = render(
      <KeyValue propName={propName} initialModel={{ key1: 'value1' }} onChange={onChangeMock} />,
    );

    expect(screen.getByDisplayValue('key1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value1')).toBeInTheDocument();

    rerender(<KeyValue propName={propName} initialModel={{ key2: 'value2' }} onChange={onChangeMock} />);

    expect(screen.getByDisplayValue('key2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value2')).toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('should not reset entries when the parent echoes back the emitted model', () => {
    const onChangeMock = vi.fn();

    const ControlledKeyValue = () => {
      const [model, setModel] = useState<Record<string, string>>({ key1: 'value1' });
      return (
        <KeyValue
          propName={propName}
          initialModel={model}
          onChange={(newModel) => {
            onChangeMock(newModel);
            setModel({ ...newModel }); // parent clones the emitted object
          }}
        />
      );
    };

    render(<ControlledKeyValue />);

    // Add a new property
    fireEvent.click(screen.getByTestId(`${propName}__add`));

    // onChange called once for the add action, not a second time for the echo
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });

  describe('focus', () => {
    it('focuses the key of a newly added pair', () => {
      render(<KeyValue propName={propName} initialModel={initialModel} onChange={vi.fn()} />);

      fireEvent.click(screen.getByTestId(`${propName}__add`));

      const keys = screen.getAllByTestId(`${propName}__key`);
      expect(keys).toHaveLength(3);
      expect(keys[2]).toHaveFocus();
    });

    it.each([
      ['key', 'key1', 'newKey1'],
      ['value', 'value1', 'newValue1'],
    ])('keeps the focus in the %s being typed when the list updates', (_, current, typed) => {
      render(<KeyValue propName={propName} initialModel={initialModel} onChange={vi.fn()} />);
      const input = screen.getByDisplayValue(current);
      fireEvent.focus(input);
      const focus = vi.spyOn(input, 'focus');

      fireEvent.change(input, { target: { value: typed } });

      expect(focus).toHaveBeenCalled();
    });

    it.each([
      ['key', 'key1', 'newKey1'],
      ['value', 'value1', 'newValue1'],
    ])('does not take the focus back to a %s that was left', (_, current, typed) => {
      render(<KeyValue propName={propName} initialModel={initialModel} onChange={vi.fn()} />);
      const input = screen.getByDisplayValue(current);
      fireEvent.focus(input);
      fireEvent.blur(input);
      const focus = vi.spyOn(input, 'focus');

      fireEvent.change(input, { target: { value: typed } });

      expect(focus).not.toHaveBeenCalled();
    });
  });
});
