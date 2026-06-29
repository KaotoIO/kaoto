import { act, fireEvent, render, screen } from '@testing-library/react';

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

  it('should open dropdown on focus regardless of current value', () => {
    render(<TypeaheadSelect value="invoice-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should show all options when dropdown opens', () => {
    render(<TypeaheadSelect value="invoice-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('Shipment')).toBeInTheDocument();
  });

  it('should not call onChange when typing', () => {
    const onChange = vi.fn();
    render(<TypeaheadSelect value="order-key" onChange={onChange} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Inv' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should filter options when typing', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Inv' } });
    });
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByText('Order')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipment')).not.toBeInTheDocument();
  });

  it('should call onChange when option is clicked', () => {
    const onChange = vi.fn();
    render(<TypeaheadSelect value="order-key" onChange={onChange} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.click(screen.getByText('Invoice'));
    });
    expect(onChange).toHaveBeenCalledWith('invoice-key');
  });

  it('should revert to selected label on blur', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Inv' } });
    });
    expect(getInput().value).toBe('Inv');

    act(() => {
      fireEvent.blur(getInput(), { relatedTarget: document.body });
    });
    expect(getInput().value).toBe('Order');
  });

  it('should display label instead of value in dropdown', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.queryByText('order-key')).not.toBeInTheDocument();
  });

  it('should filter by description', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'invoice' } });
    });
    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByText('Order')).not.toBeInTheDocument();
  });

  it('should open dropdown via toggle click', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    const toggle = getToggleButton();
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
  });

  it('should close dropdown via toggle click when open', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const toggle = getToggleButton();
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should clear filter text when clear button is clicked', () => {
    render(<TypeaheadSelect value="order-key" onChange={vi.fn()} options={OPTIONS} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Inv' } });
    });
    expect(getInput().value).toBe('Inv');

    act(() => {
      fireEvent.click(screen.getByLabelText('Clear expression'));
    });
    expect(getInput().value).toBe('');
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Invoice')).toBeInTheDocument();
  });

  it('should not open dropdown on focus when no options exist', () => {
    render(<TypeaheadSelect value="" onChange={vi.fn()} options={[]} data-testid="select-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
