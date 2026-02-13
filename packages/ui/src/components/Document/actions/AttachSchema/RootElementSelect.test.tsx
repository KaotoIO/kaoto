import { act, findByLabelText, fireEvent, getByLabelText, render, screen, waitFor } from '@testing-library/react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { RootElementSelect } from './RootElementSelect';

describe('RootElementSelect', () => {
  const createOptions = (names: string[], namespaceUri = 'urn:test'): RootElementOption[] =>
    names.map((name) => ({ name, namespaceUri }));

  it('should render with selected option', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = jest.fn();

    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    const selector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
    const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
    expect(input.getAttribute('value')).toEqual('Order');
  });

  it('should reflect new selectedOption on re-render', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = jest.fn();

    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />,
    );

    const selector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
    const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
    expect(input.getAttribute('value')).toEqual('Order');

    const updatedOptions = createOptions(['Shipment']);
    rerender(
      <RootElementSelect rootElementOptions={updatedOptions} selectedOption={updatedOptions[0]} onChange={onChange} />,
    );

    await waitFor(() => {
      expect(input.getAttribute('value')).toEqual('Shipment');
    });
  });

  it('should default to first option when selectedOption is undefined', async () => {
    const options = createOptions(['Order', 'Invoice']);
    const onChange = jest.fn();

    render(<RootElementSelect rootElementOptions={options} selectedOption={undefined} onChange={onChange} />);

    const selector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
    const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
    expect(input.getAttribute('value')).toEqual('Order');
  });

  it('should call onChange with the matching RootElementOption when user selects', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = jest.fn();

    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
    act(() => {
      fireEvent.click(dropdownToggle);
    });

    const selectList = screen.getByTestId('attach-schema-root-element-typeahead-select');
    const invoiceOption = await findByLabelText(selectList, 'option invoice');
    act(() => {
      fireEvent.click(invoiceOption);
    });

    expect(onChange).toHaveBeenCalledWith({ name: 'Invoice', namespaceUri: 'urn:test' });
  });

  it('should preserve selection when unrelated file is removed', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = jest.fn();

    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[1]} onChange={onChange} />,
    );

    const selector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
    const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
    expect(input.getAttribute('value')).toEqual('Invoice');

    const remainingOptions = createOptions(['Order', 'Invoice']);
    rerender(
      <RootElementSelect
        rootElementOptions={remainingOptions}
        selectedOption={remainingOptions[1]}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(input.getAttribute('value')).toEqual('Invoice');
    });
  });

  it('should default to first remaining option when selected root element is removed', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = jest.fn();

    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[1]} onChange={onChange} />,
    );

    const selector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
    const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
    expect(input.getAttribute('value')).toEqual('Invoice');

    const remainingOptions = createOptions(['Order', 'Shipment']);
    rerender(
      <RootElementSelect
        rootElementOptions={remainingOptions}
        selectedOption={remainingOptions[0]}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(input.getAttribute('value')).toEqual('Order');
    });
  });

  it('should omit description when namespaceUri is empty', async () => {
    const options = createOptions(['Order', 'Invoice'], '');
    const onChange = jest.fn();

    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
    act(() => {
      fireEvent.click(dropdownToggle);
    });

    const selectList = screen.getByTestId('attach-schema-root-element-typeahead-select');
    const orderOption = await findByLabelText(selectList, 'option order');
    expect(orderOption).toBeInTheDocument();
    expect(orderOption.textContent).not.toContain('Namespace URI');
  });
});
