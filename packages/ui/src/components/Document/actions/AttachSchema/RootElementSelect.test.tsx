import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { RootElementSelect } from './RootElementSelect';

describe('RootElementSelect', () => {
  const createOptions = (names: string[], namespaceUri = 'urn:test'): RootElementOption[] =>
    names.map((name) => ({ name, namespaceUri }));

  const getInput = () => screen.getByTestId('attach-schema-root-element').querySelector('input') as HTMLInputElement;

  const openDropdown = () => {
    fireEvent.focus(getInput());
  };

  it('should render with selected option', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);
    expect(getInput().value).toBe('Order');
  });

  it('should reflect new selectedOption on re-render', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />,
    );
    expect(getInput().value).toBe('Order');

    const updatedOptions = createOptions(['Shipment']);
    rerender(
      <RootElementSelect rootElementOptions={updatedOptions} selectedOption={updatedOptions[0]} onChange={vi.fn()} />,
    );
    await waitFor(() => {
      expect(getInput().value).toBe('Shipment');
    });
  });

  it('should default to first option when selectedOption is undefined', async () => {
    const options = createOptions(['Order', 'Invoice']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={undefined} onChange={vi.fn()} />);
    expect(getInput().value).toBe('Order');
  });

  it('should call onChange with the matching RootElementOption when user selects', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    openDropdown();
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Invoice'));
    expect(onChange).toHaveBeenCalledWith({ name: 'Invoice', namespaceUri: 'urn:test' });
  });

  it('should preserve selection when unrelated file is removed', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[1]} onChange={vi.fn()} />,
    );
    expect(getInput().value).toBe('Invoice');

    const remainingOptions = createOptions(['Order', 'Invoice']);
    rerender(
      <RootElementSelect
        rootElementOptions={remainingOptions}
        selectedOption={remainingOptions[1]}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(getInput().value).toBe('Invoice');
    });
  });

  it('should default to first remaining option when selected root element is removed', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    const { rerender } = render(
      <RootElementSelect rootElementOptions={options} selectedOption={options[1]} onChange={vi.fn()} />,
    );
    expect(getInput().value).toBe('Invoice');

    const remainingOptions = createOptions(['Order', 'Shipment']);
    rerender(
      <RootElementSelect
        rootElementOptions={remainingOptions}
        selectedOption={remainingOptions[0]}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(getInput().value).toBe('Order');
    });
  });

  it('should distinguish same-name elements in different namespaces', async () => {
    const options: RootElementOption[] = [
      { name: 'Root', namespaceUri: 'urn:ns-a' },
      { name: 'Root', namespaceUri: 'urn:ns-b' },
    ];
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[1]} onChange={onChange} />);
    expect(getInput().value).toBe('Root');

    openDropdown();
    const listbox = screen.getByRole('listbox');
    const rootOptions = listbox.querySelectorAll('[role="option"]');
    expect(rootOptions).toHaveLength(2);

    fireEvent.click(rootOptions[0]);
    expect(onChange).toHaveBeenCalledWith({ name: 'Root', namespaceUri: 'urn:ns-a' });
  });

  it('should select correct option when same-name elements exist in different namespaces', async () => {
    const options: RootElementOption[] = [
      { name: 'Root', namespaceUri: 'urn:ns-a' },
      { name: 'Root', namespaceUri: 'urn:ns-b' },
    ];
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    openDropdown();
    const listbox = screen.getByRole('listbox');
    const rootOptions = listbox.querySelectorAll('[role="option"]');

    fireEvent.click(rootOptions[1]);
    expect(onChange).toHaveBeenCalledWith({ name: 'Root', namespaceUri: 'urn:ns-b' });
  });

  it('should omit description when namespaceUri is empty', async () => {
    const options = createOptions(['Order', 'Invoice'], '');
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    openDropdown();
    const orderOption = screen.getByText('Order');
    expect(orderOption).toBeInTheDocument();
    expect(orderOption.closest('[role="option"]')?.textContent).not.toContain('Namespace URI');
  });

  it('should filter options by typing', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    openDropdown();
    fireEvent.change(getInput(), { target: { value: 'Inv' } });
    const listbox = screen.getByRole('listbox');
    const visibleOptions = listbox.querySelectorAll('[role="option"]');
    expect(visibleOptions).toHaveLength(1);
    expect(screen.getByText('Invoice')).toBeInTheDocument();
  });

  it('should filter by namespace description', async () => {
    const options: RootElementOption[] = [
      { name: 'Root', namespaceUri: 'urn:ns-a' },
      { name: 'Root', namespaceUri: 'urn:ns-b' },
      { name: 'Other', namespaceUri: 'urn:ns-c' },
    ];
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    openDropdown();
    fireEvent.change(getInput(), { target: { value: 'ns-a' } });
    const listbox = screen.getByRole('listbox');
    const visibleOptions = listbox.querySelectorAll('[role="option"]');
    expect(visibleOptions).toHaveLength(1);
  });

  it('should not call onChange when typing', async () => {
    const options = createOptions(['Order', 'Invoice']);
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    openDropdown();
    fireEvent.change(getInput(), { target: { value: 'Inv' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should revert to selected option label on blur', async () => {
    const options = createOptions(['Order', 'Invoice']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    openDropdown();
    fireEvent.change(getInput(), { target: { value: 'Inv' } });
    expect(getInput().value).toBe('Inv');

    fireEvent.blur(getInput(), { relatedTarget: document.body });
    await waitFor(() => {
      expect(getInput().value).toBe('Order');
    });
  });
});
