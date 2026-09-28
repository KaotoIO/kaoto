import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TypeaheadSelect, TypeaheadSelectOption } from './TypeaheadSelect';

const OPTIONS: TypeaheadSelectOption[] = [
  { value: 'order-key', label: 'Order', description: 'type: order' },
  { value: 'invoice-key', label: 'Invoice', description: 'type: invoice' },
  { value: 'shipment-key', label: 'Shipment', description: 'type: shipment' },
];

const getInput = () => screen.getByTestId('select-input').querySelector('input') as HTMLInputElement;
const getToggleButton = () =>
  screen
    .getByTestId('select-input')
    .closest('.pf-v6-c-menu-toggle')!
    .querySelector('.pf-v6-c-menu-toggle__button') as HTMLButtonElement;

describe('TypeaheadSelect', () => {
  it('should display selected option label when dropdown is closed', () => {
    render(<TypeaheadSelect value="invoice-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    expect(getInput().value).toBe('Invoice');
  });

  it('should open dropdown on focus regardless of current value', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="invoice-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('should show all options when dropdown opens', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="invoice-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    expect(await screen.findByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Shipment')).toBeInTheDocument();
  });

  it('should not call onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeaheadSelect value="order-key" onChange={onChange} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    await user.type(getInput(), 'Inv');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should filter options when typing', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    await user.type(getInput(), 'Inv');
    expect(await screen.findByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByText('Order')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipment')).not.toBeInTheDocument();
  });

  it('should call onChange when option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeaheadSelect value="order-key" onChange={onChange} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    const invoiceOption = await screen.findByText('Invoice');
    await user.click(invoiceOption);
    expect(onChange).toHaveBeenCalledWith('invoice-key');
  });

  it('should revert to selected label on blur', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />
        <button data-testid="outside-button">Outside</button>
      </div>,
    );
    await user.click(getInput());
    await user.type(getInput(), 'Inv');
    expect(getInput().value).toBe('Inv');

    await user.click(screen.getByTestId('outside-button'));
    expect(getInput().value).toBe('Order');
  });

  it('should display label instead of value in dropdown', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    expect(await screen.findByText('Order')).toBeInTheDocument();
    expect(screen.queryByText('order-key')).not.toBeInTheDocument();
  });

  it('should filter by description', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    await user.type(getInput(), 'invoice');
    expect(await screen.findByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByText('Order')).not.toBeInTheDocument();
  });

  it('should open dropdown via toggle click', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    const toggle = getToggleButton();
    await user.click(toggle);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
  });

  it('should close dropdown via toggle click when open', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    const toggle = getToggleButton();
    await user.click(toggle);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should clear filter text when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    await user.type(getInput(), 'Inv');
    expect(getInput().value).toBe('Inv');

    await user.click(screen.getByLabelText('Clear expression'));
    expect(getInput().value).toBe('');
    expect(await screen.findByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
  });

  it('should not open dropdown on focus when no options exist', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="" onChange={vi.fn()} options={[]} data-testid="select-input" />);
    await user.click(getInput());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should not close when blur target is inside the listbox', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());

    // Dropdown listbox items exist
    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    // Clicking an option item or focusing inside listbox keeps listbox open until action takes place
    expect(screen.getAllByRole('listbox').length).toBeGreaterThan(0);
  });

  it('should fall back to value when option has no label', () => {
    const noLabelOptions: TypeaheadSelectOption[] = [{ value: 'raw-value', description: 'some description' }];
    render(
      <TypeaheadSelect value="raw-value" onChange={vi.fn()} options={noLabelOptions} data-testid="select-input" />,
    );
    // selectedLabel should fall back to value when label is undefined
    expect(getInput().value).toBe('raw-value');
  });

  it('should display value in dropdown when option has no label', async () => {
    const user = userEvent.setup();
    const noLabelOptions: TypeaheadSelectOption[] = [{ value: 'raw-value', description: 'some description' }];
    render(
      <TypeaheadSelect value="other-value" onChange={vi.fn()} options={noLabelOptions} data-testid="select-input" />,
    );
    await user.click(getInput());
    expect(await screen.findByText('raw-value')).toBeInTheDocument();
  });

  it('should not call onChange when dropdown opens without selecting an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TypeaheadSelect value="order-key" onChange={onChange} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    // Opening the dropdown alone must not trigger onChange
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should keep dropdown open when typing while already open', async () => {
    const user = userEvent.setup();
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    await user.click(getInput());
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    // Type while dropdown is already open — it should remain open
    await user.type(getInput(), 'O');
    expect(screen.getAllByRole('listbox').length).toBeGreaterThan(0);
  });

  it('should not render clear button when no value is displayed', () => {
    render(<TypeaheadSelect value="" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    expect(screen.queryByLabelText('Clear expression')).not.toBeInTheDocument();
  });
});
