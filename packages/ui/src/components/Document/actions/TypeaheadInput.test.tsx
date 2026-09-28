import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TypeaheadInput, TypeaheadInputOption } from './TypeaheadInput';

const OPTIONS: TypeaheadInputOption[] = [
  { value: 'Title', description: 'string' },
  { value: 'Price', description: 'decimal' },
  { value: 'ShipTo/Name', description: 'string' },
];

const getInput = () => screen.getByTestId('xpath-input').querySelector('input') as HTMLInputElement;

describe('TypeaheadInput', () => {
  it('should render with value and placeholder', () => {
    render(
      <TypeaheadInput
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        data-testid="xpath-input"
        placeholder="Enter XPath"
      />,
    );
    const input = getInput();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter XPath');
  });

  it('should render with default placeholder when not provided', () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(getInput()).toHaveAttribute('placeholder', 'Type to search');
  });

  it('should call onChange when typing', async () => {
    const onChange = vi.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.change(getInput(), { target: { value: 'Ti' } });
    // findByRole drains Popper's deferred positioning inside act()
    await screen.findByRole('listbox');
    expect(onChange).toHaveBeenCalledWith('Ti');
  });

  it('should show only matching options when value filters', async () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    fireEvent.change(getInput(), { target: { value: 'Ti' } });
    rerender(<TypeaheadInput value="Ti" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    // findByRole waits for Popper to finish positioning the menu inside act()
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('Price')).not.toBeInTheDocument();
  });

  it('should close dropdown when no options match', async () => {
    const onChange = vi.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.change(getInput(), { target: { value: 'string-length(' } });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should filter options by description as well', async () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    fireEvent.change(getInput(), { target: { value: 'decimal' } });
    rerender(<TypeaheadInput value="decimal" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    // findByRole waits for Popper to finish positioning the menu inside act()
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('should call onChange with selected value and close dropdown', async () => {
    const onChange = vi.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);

    fireEvent.change(getInput(), { target: { value: 'Ti' } });
    // findByRole waits for Popper to finish positioning the menu inside act()
    await screen.findByRole('listbox');

    fireEvent.click(screen.getByText('Title'));
    expect(onChange).toHaveBeenCalledWith('Title');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should open dropdown on focus when value is empty and options exist', async () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    // findByRole waits for Popper to finish positioning the menu inside act()
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('should not open dropdown on focus when value is non-empty', async () => {
    render(<TypeaheadInput value="Title" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should not open dropdown on focus when no options exist', async () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={[]} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should close dropdown on blur', async () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    // findByRole waits for Popper to finish positioning the menu inside act()
    await screen.findByRole('listbox');

    fireEvent.blur(getInput(), { relatedTarget: document.body });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should show clear button when value is non-empty', () => {
    render(<TypeaheadInput value="Title" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByLabelText('Clear expression')).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.queryByLabelText('Clear expression')).not.toBeInTheDocument();
  });

  it('should call onChange with empty string when clear button is clicked', async () => {
    const onChange = vi.fn();
    render(<TypeaheadInput value="Title" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.click(screen.getByLabelText('Clear expression'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  it('should set Select id with suffix when id is provided', async () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} id="my-input" data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    // findByRole waits for Popper to finish positioning the menu inside act()
    const listbox = await screen.findByRole('listbox');
    expect(listbox.closest('[id="my-input-select"]')).toBeInTheDocument();
  });

  it('should pass aria-label to the input', () => {
    render(
      <TypeaheadInput
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        data-testid="xpath-input"
        ariaLabel="Sort expression 1"
      />,
    );
    expect(getInput()).toHaveAttribute('aria-label', 'Sort expression 1');
  });

  it('should not open dropdown on focus after external value update from empty to non-empty', async () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    rerender(<TypeaheadInput value="Title" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('should show all options when value is empty and dropdown is open', async () => {
    render(<TypeaheadInput value="" onChange={vi.fn()} options={OPTIONS} data-testid="xpath-input" />);
    fireEvent.focus(getInput());
    // findByRole waits for Popper to finish positioning the menu inside act()
    await screen.findByRole('listbox');
    for (const opt of OPTIONS) {
      expect(screen.getByText(opt.value)).toBeInTheDocument();
    }
  });
});
