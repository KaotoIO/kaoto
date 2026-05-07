import { act, fireEvent, render, screen } from '@testing-library/react';

import { TypeaheadXPathInput, TypeaheadXPathInputOption } from './TypeaheadXPathInput';

const OPTIONS: TypeaheadXPathInputOption[] = [
  { value: 'Title', description: 'string' },
  { value: 'Price', description: 'decimal' },
  { value: 'ShipTo/Name', description: 'string' },
];

const getInput = () => screen.getByTestId('xpath-input').querySelector('input') as HTMLInputElement;

describe('TypeaheadXPathInput', () => {
  it('should render with value and placeholder', () => {
    render(
      <TypeaheadXPathInput
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
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(getInput()).toHaveAttribute('placeholder', 'XPath expression');
  });

  it('should call onChange when typing', () => {
    const onChange = jest.fn();
    render(<TypeaheadXPathInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Ti' } });
    });
    expect(onChange).toHaveBeenCalledWith('Ti');
  });

  it('should show only matching options when value filters', () => {
    const { rerender } = render(
      <TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'Ti' } });
    });
    rerender(<TypeaheadXPathInput value="Ti" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('Price')).not.toBeInTheDocument();
  });

  it('should close dropdown when no options match', () => {
    const onChange = jest.fn();
    render(<TypeaheadXPathInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'string-length(' } });
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should filter options by description as well', () => {
    const { rerender } = render(
      <TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />,
    );
    act(() => {
      fireEvent.change(getInput(), { target: { value: 'decimal' } });
    });
    rerender(<TypeaheadXPathInput value="decimal" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('should call onChange with selected value and close dropdown', () => {
    const onChange = jest.fn();
    render(<TypeaheadXPathInput value="" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);

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
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should not open dropdown on focus when value is non-empty', () => {
    render(<TypeaheadXPathInput value="Title" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should not open dropdown on focus when no options exist', () => {
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={[]} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should close dropdown on blur', () => {
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
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
    render(<TypeaheadXPathInput value="Title" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.getByLabelText('Clear expression')).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    expect(screen.queryByLabelText('Clear expression')).not.toBeInTheDocument();
  });

  it('should call onChange with empty string when clear button is clicked', () => {
    const onChange = jest.fn();
    render(<TypeaheadXPathInput value="Title" onChange={onChange} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.click(screen.getByLabelText('Clear expression'));
    });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should set Select id with suffix when id is provided', () => {
    render(
      <TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} id="my-input" data-testid="xpath-input" />,
    );
    act(() => {
      fireEvent.focus(getInput());
    });
    expect(screen.getByRole('listbox').closest('[id="my-input-select"]')).toBeInTheDocument();
  });

  it('should pass aria-label to the input', () => {
    render(
      <TypeaheadXPathInput
        value=""
        onChange={jest.fn()}
        options={OPTIONS}
        data-testid="xpath-input"
        ariaLabel="Sort expression 1"
      />,
    );
    expect(getInput()).toHaveAttribute('aria-label', 'Sort expression 1');
  });

  it('should show all options when value is empty and dropdown is open', () => {
    render(<TypeaheadXPathInput value="" onChange={jest.fn()} options={OPTIONS} data-testid="xpath-input" />);
    act(() => {
      fireEvent.focus(getInput());
    });
    for (const opt of OPTIONS) {
      expect(screen.getByText(opt.value)).toBeInTheDocument();
    }
  });
});
