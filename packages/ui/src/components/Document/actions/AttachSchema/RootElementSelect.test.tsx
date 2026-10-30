import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RootElementOption } from '../../../../models/datamapper/document';
import { RootElementSelect } from './RootElementSelect';

describe('RootElementSelect', () => {
  const user = userEvent.setup();
  const createOptions = (names: string[], namespaceUri = 'urn:test'): RootElementOption[] =>
    names.map((name) => ({ name, namespaceUri }));

  const getInput = () => screen.getByTestId('attach-schema-root-element').querySelector('input') as HTMLInputElement;

  const openDropdown = async () => {
    await user.click(getInput());
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

    await openDropdown();
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

    await openDropdown();
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

    await openDropdown();
    const listbox = screen.getByRole('listbox');
    const rootOptions = listbox.querySelectorAll('[role="option"]');

    fireEvent.click(rootOptions[1]);
    expect(onChange).toHaveBeenCalledWith({ name: 'Root', namespaceUri: 'urn:ns-b' });
  });

  it('should omit description when namespaceUri and entrySchemaFile are empty', async () => {
    const options = createOptions(['Order', 'Invoice'], '');
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    await openDropdown();
    const orderOption = screen.getByText('Order');
    expect(orderOption).toBeInTheDocument();
    expect(orderOption.closest('[role="option"]')?.textContent).not.toContain('Namespace URI:');
    expect(orderOption.closest('[role="option"]')?.textContent).not.toContain('File:');
  });

  it('should distinguish same-name elements from different entry schema files', async () => {
    const options: RootElementOption[] = [
      { name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'A.xsd' },
      { name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'B.xsd' },
    ];
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    await openDropdown();
    const listbox = screen.getByRole('listbox');
    const rootOptions = listbox.querySelectorAll('[role="option"]');
    expect(rootOptions).toHaveLength(2);

    fireEvent.click(rootOptions[1]);
    expect(onChange).toHaveBeenCalledWith({ name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'B.xsd' });
  });

  it('(B1) should pre-select the option passed as selectedOption among same-name options from different entries', async () => {
    // Two options share the same name but come from different entry files.
    const firstOption: RootElementOption = { name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'First.xsd' };
    const secondOption: RootElementOption = { name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'Second.xsd' };
    const options = [firstOption, secondOption];

    // selectedOption = secondOption (B1 fix: AttachSchemaModal picks the option matching entrySchemaFile)
    render(<RootElementSelect rootElementOptions={options} selectedOption={secondOption} onChange={vi.fn()} />);

    // Input shows the label of the selected option (both share 'Root').
    expect(getInput().value).toBe('Root');

    // Open dropdown: only the second option (Second.xsd) must be aria-selected.
    await openDropdown();
    const listbox = screen.getByRole('listbox');
    const allOptions = listbox.querySelectorAll('[role="option"]');
    expect(allOptions).toHaveLength(2);

    // PatternFly marks the selected option with aria-selected="true".
    const selectedDomOptions = listbox.querySelectorAll('[aria-selected="true"]');
    expect(selectedDomOptions).toHaveLength(1);

    // The selected option's text must contain 'Root' but its File label must be 'File: Second.xsd'
    // (ambiguous name → File: prefix), confirming Second.xsd is pre-selected, not First.xsd.
    expect(selectedDomOptions[0].textContent).toContain('Root');
    expect(selectedDomOptions[0].textContent).toContain('Second.xsd');
    expect(selectedDomOptions[0].textContent).not.toContain('First.xsd');
  });

  it('(B5) should show "File: <declaring> (via <entry>)" for elements declared in an included schema', async () => {
    // Entry schema is Main.xsd; CommonTypes.xsd is included and declares its own global elements.
    const mainOption: RootElementOption = { name: 'Root', namespaceUri: 'urn:ns', entrySchemaFile: 'Main.xsd' };
    const indirectOption: RootElementOption = {
      name: 'AuxRoot',
      namespaceUri: 'urn:ns',
      entrySchemaFile: 'Main.xsd',
      declaringFile: 'CommonTypes.xsd',
    };
    const options = [mainOption, indirectOption];

    render(<RootElementSelect rootElementOptions={options} selectedOption={mainOption} onChange={vi.fn()} />);

    await openDropdown();
    const listbox = screen.getByRole('listbox');

    // AuxRoot is declared in CommonTypes.xsd and reached through the Main.xsd entry.
    const auxOption = listbox.querySelectorAll('[role="option"]')[1];
    expect(auxOption.textContent).toContain('AuxRoot');
    expect(auxOption.textContent).toContain('File: CommonTypes.xsd (via Main.xsd)');

    // Root is from Main.xsd (the entry schema itself) — no 'via' or 'File:' label needed.
    const rootOption = listbox.querySelectorAll('[role="option"]')[0];
    expect(rootOption.textContent).not.toContain('via');
    expect(rootOption.textContent).not.toContain('File:');
  });

  it('should filter options by typing', async () => {
    const options = createOptions(['Order', 'Invoice', 'Shipment']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    await openDropdown();
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

    await openDropdown();
    fireEvent.change(getInput(), { target: { value: 'ns-a' } });
    const listbox = screen.getByRole('listbox');
    const visibleOptions = listbox.querySelectorAll('[role="option"]');
    expect(visibleOptions).toHaveLength(1);
  });

  it('should not call onChange when typing', async () => {
    const options = createOptions(['Order', 'Invoice']);
    const onChange = vi.fn();
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={onChange} />);

    await openDropdown();
    fireEvent.change(getInput(), { target: { value: 'Inv' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should revert to selected option label on blur', async () => {
    const options = createOptions(['Order', 'Invoice']);
    render(<RootElementSelect rootElementOptions={options} selectedOption={options[0]} onChange={vi.fn()} />);

    await openDropdown();
    fireEvent.change(getInput(), { target: { value: 'Inv' } });
    expect(getInput().value).toBe('Inv');

    fireEvent.blur(getInput(), { relatedTarget: document.body });
    await waitFor(() => {
      expect(getInput().value).toBe('Order');
    });
  });
});
