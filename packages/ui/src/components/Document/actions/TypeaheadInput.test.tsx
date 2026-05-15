import { act, fireEvent, render, screen } from '@testing-library/react';

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
        onChange={jest.fn()}
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
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(getInput()).toHaveAttribute('placeholder', 'Type to search');
  });

  it('should call onChange when typing', () => {
    const onChange = jest.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Ti' } });
    });
    expect(onChange).toHaveBeenCalledWith('Ti');
  });

  it('should show only matching options when value filters', () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Ti' } });
    });
    rerender(<TypeaheadInput value="Ti" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('Price')).not.toBeInTheDocument();
  });

  it('should close dropdown when no options match', () => {
    const onChange = jest.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'string-length(' } });
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should filter options by description as well', () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'decimal' } });
    });
    rerender(<TypeaheadInput value="decimal" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('should call onChange with selected value and close dropdown', () => {
    const onChange = jest.fn();
    render(<TypeaheadInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);

    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Ti' } });
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Title'));
    });
    expect(onChange).toHaveBeenCalledWith('Title');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should open dropdown on focus when value is empty and options exist', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should not open dropdown on focus when value is non-empty', () => {
    render(<TypeaheadInput value="Title" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should not open dropdown on focus when no options exist', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={[]} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should close dropdown on blur', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    act(() => {
      fireEvent.blur(getInput(), { relatedTarget: document.body });
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should show clear button when value is non-empty', () => {
    render(<TypeaheadInput value="Title" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByLabelText('Clear expression')).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.queryByLabelText('Clear expression')).not.toBeInTheDocument();
  });

  it('should call onChange with empty string when clear button is clicked', () => {
    const onChange = jest.fn();
    render(<TypeaheadInput value="Title" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.click(screen.getByLabelText('Clear expression'));
    });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should set Select id with suffix when id is provided', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} id="my-input" data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox').closest('[id="my-input-select"]')).toBeInTheDocument();
  });

  it('should pass aria-label to the input', () => {
    render(
      <TypeaheadInput
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
        data-testid="xpath-input"
        ariaLabel="Sort expression 1"
      />,
    );
    expect(getInput()).toHaveAttribute('aria-label', 'Sort expression 1');
  });

  it('should not open dropdown on focus after external value update from empty to non-empty', () => {
    const { rerender } = render(
      <TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    rerender(<TypeaheadInput value="Title" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should show all options when value is empty and dropdown is open', () => {
    render(<TypeaheadInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    for (const opt of OPTIONS) {
      expect(screen.getByText(opt.value)).toBeInTheDocument();
    }
  });
});
