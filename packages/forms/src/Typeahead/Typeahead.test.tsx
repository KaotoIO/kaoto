import { act, fireEvent, render, screen } from '@testing-library/react';

import { CREATE_NEW_ITEM, Typeahead } from './Typeahead';
import { TypeaheadProps } from './Typeahead.types';

const mockItems = [
  { name: 'Item 1', value: 'item1', description: 'Description 1' },
  { name: 'Item 2', value: 'item2', description: 'Description 2' },
];

const defaultProps: TypeaheadProps = {
  selectedItem: undefined,
  items: mockItems,
  id: 'test-typeahead',
  onChange: vi.fn(),
  onCleanInput: vi.fn(),
  'aria-label': 'Typeahead',
  'data-testid': 'typeahead',
};

describe('Typeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  it('should renders the Typeahead component', async () => {
    const { container } = render(<Typeahead {...defaultProps} />);

    expect(container).toMatchSnapshot();
  });

  it('should renders the Typeahead component with disabled button', async () => {
    const { container } = render(<Typeahead {...defaultProps} disabled />);

    expect(container).toMatchSnapshot();
  });

  it('should opens the dropdown when the toggle is clicked', async () => {
    render(<Typeahead {...defaultProps} />);
    const toggle = screen.getByLabelText('Open');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should filters items based on input value', async () => {
    render(<Typeahead {...defaultProps} />);

    const input = screen.getByPlaceholderText('Select or write an option');
    await act(async () => {
      fireEvent.click(input);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Item 1' } });
    });

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('should display no items found when no items match the input value', async () => {
    render(<Typeahead {...defaultProps} />);

    const input = screen.getByPlaceholderText('Select or write an option');
    await act(async () => {
      fireEvent.click(input);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Non-existent Item' } });
    });

    const listbox = screen.getByRole('listbox');
    expect(listbox.children.length).toBe(0);
  });

  it('should calls onChange when an item is selected', async () => {
    render(<Typeahead {...defaultProps} />);
    const toggle = screen.getByLabelText('Open');

    await act(async () => {
      fireEvent.click(toggle);
    });

    const option = screen.getByText('Item 1');
    act(() => {
      fireEvent.click(option);
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should calls onCleanInput when clear button is clicked', async () => {
    render(<Typeahead {...defaultProps} selectedItem={mockItems[0]} />);

    await act(async () => {
      vi.runAllTimers();
    });

    const clearButton = screen.getByRole('button', { name: /clear selected item/i });
    fireEvent.click(clearButton);

    expect(defaultProps.onCleanInput).toHaveBeenCalled();
  });

  it('should allow users to create a new item if the onCreate callback is set without typing input', async () => {
    render(<Typeahead {...defaultProps} onCreate={vi.fn()} onCreatePrefix="multiverse" />);

    const toggle = screen.getByLabelText('Open');
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByText('Create new multiverse')).toBeInTheDocument();
  });

  it('should allow users to create a new item if the onCreate callback is set and there is a value', async () => {
    render(<Typeahead {...defaultProps} onCreate={vi.fn()} onCreatePrefix="brick" />);

    const input = screen.getByPlaceholderText('Select or write an option');
    await act(async () => {
      fireEvent.click(input);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'in the wall' } });
    });

    const createNewElement = screen.getByText("Create new brick 'in the wall'");

    expect(createNewElement).toBeInTheDocument();
  });

  describe('Custom Input functionality', () => {
    const customInputProps = {
      ...defaultProps,
      allowCustomInput: true,
      onChange: vi.fn(),
    };

    beforeEach(() => {
      customInputProps.onChange.mockClear();
    });

    it('should preserve custom input when Enter is pressed', async () => {
      render(<Typeahead {...customInputProps} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.change(input, { target: { value: '{{aws.region}}' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(customInputProps.onChange).toHaveBeenCalledWith({
        name: '{{aws.region}}',
        value: '{{aws.region}}',
        description: '',
      });
    });

    it('should preserve custom input when blurred', async () => {
      render(<Typeahead {...customInputProps} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'custom-value' } });
        fireEvent.blur(input);
      });

      expect(customInputProps.onChange).toHaveBeenCalledWith({
        name: 'custom-value',
        value: 'custom-value',
        description: '',
      });
    });

    it('should show custom input option when no matches found', async () => {
      render(<Typeahead {...customInputProps} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'no-match-value' } });
      });

      expect(input).toHaveValue('no-match-value');
    });

    it('should show helper text when no input and custom input allowed', async () => {
      const propsWithoutItems = { ...customInputProps, items: [] };
      render(<Typeahead {...propsWithoutItems} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.click(input);
      });

      expect(input).toBeInTheDocument();
    });

    it('should allow selection of custom value from dropdown', async () => {
      render(<Typeahead {...customInputProps} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'custom-dropdown-value' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(customInputProps.onChange).toHaveBeenCalledWith({
        name: 'custom-dropdown-value',
        value: 'custom-dropdown-value',
        description: '',
      });
    });

    it('should not preserve empty custom input', async () => {
      render(<Typeahead {...customInputProps} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(customInputProps.onChange).not.toHaveBeenCalled();
    });

    it('should show regular "No items found" when custom input disabled', async () => {
      render(<Typeahead {...defaultProps} allowCustomInput={false} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'no-match' } });
      });

      const listbox = screen.getByRole('listbox');
      expect(listbox.children.length).toBe(0);
    });
  });

  describe('onInputValueChange', () => {
    const onInputValueChange = vi.fn();
    const propsWithInputValueListener = {
      ...defaultProps,
      onInputValueChange,
    };

    beforeEach(() => {
      onInputValueChange.mockClear();
    });

    it('should call onInputValueChange when typing', async () => {
      render(<Typeahead {...propsWithInputValueListener} />);
      const input = screen.getByPlaceholderText('Select or write an option');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'typed value' } });
      });

      expect(onInputValueChange).toHaveBeenCalledWith('typed value');
    });

    it('should call onInputValueChange when input is cleared', async () => {
      render(<Typeahead {...propsWithInputValueListener} selectedItem={mockItems[0]} />);

      await act(async () => {
        vi.runAllTimers();
      });

      const clearButton = screen.getByRole('button', { name: /clear selected item/i });
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(onInputValueChange).toHaveBeenCalledWith('');
    });

    it('should call onInputValueChange with selected option label', async () => {
      render(<Typeahead {...propsWithInputValueListener} />);
      const toggle = screen.getByLabelText('Open');

      await act(async () => {
        fireEvent.click(toggle);
      });

      const option = screen.getByText('Item 1');
      await act(async () => {
        fireEvent.click(option);
      });

      expect(onInputValueChange).toHaveBeenCalledWith('Item 1');
    });
  });

  describe('selection', () => {
    const openMenu = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText('Open'));
      });
    };

    it('offers all items again after the selected item changed from outside', async () => {
      const { rerender } = render(<Typeahead {...defaultProps} selectedItem={mockItems[0]} />);

      rerender(<Typeahead {...defaultProps} selectedItem={mockItems[1]} />);
      await openMenu();

      expect(screen.getByRole('combobox')).toHaveValue('Item 2');
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        expect.stringContaining('Item 1'),
        expect.stringContaining('Item 2'),
      ]);
    });

    it('does not report the selected item again when it is picked again', async () => {
      const onChange = vi.fn();
      render(<Typeahead {...defaultProps} selectedItem={mockItems[0]} onChange={onChange} />);
      await openMenu();

      act(() => {
        fireEvent.click(screen.getAllByText('Item 1').at(-1)!);
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('reports an empty selection when it is cleared and there is no clear handler', async () => {
      const onChange = vi.fn();
      render(<Typeahead {...defaultProps} selectedItem={mockItems[0]} onChange={onChange} onCleanInput={undefined} />);
      await act(async () => {
        vi.runAllTimers();
      });

      fireEvent.click(screen.getByRole('button', { name: /clear selected item/i }));

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('asks to create an item with the typed name', async () => {
      const onCreate = vi.fn();
      render(<Typeahead {...defaultProps} onCreate={onCreate} onCreatePrefix="bean" />);
      const input = screen.getByPlaceholderText('Select or write an option');
      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'myBean' } });
      });

      act(() => {
        fireEvent.click(screen.getByText("Create new bean 'myBean'"));
      });

      expect(onCreate).toHaveBeenCalledWith(CREATE_NEW_ITEM, 'myBean');
    });

    it('names its input after the test id when it has no id', () => {
      render(<Typeahead {...defaultProps} id={undefined} />);

      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'typeahead-typeahead');
    });
  });

  describe('custom input next to the items', () => {
    const renderCustom = () => {
      const onChange = vi.fn();
      render(<Typeahead {...defaultProps} allowCustomInput onChange={onChange} />);
      return { onChange, input: screen.getByPlaceholderText('Select or write an option') };
    };

    it('takes an item name typed in full as that item, not as custom input', async () => {
      const { onChange, input } = renderCustom();

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Item 2' } });
        fireEvent.blur(input);
      });

      expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ description: '' }));
    });

    it('leaves Enter on a highlighted item to the menu', async () => {
      const { onChange, input } = renderCustom();
      await act(async () => {
        fireEvent.click(input);
        fireEvent.change(input, { target: { value: 'Item' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onChange).toHaveBeenCalledWith(mockItems[0]);
      expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'Item' }));
    });

    it('keeps a blank input on blur without reporting it', async () => {
      const { onChange, input } = renderCustom();

      await act(async () => {
        fireEvent.change(input, { target: { value: '  ' } });
        fireEvent.blur(input);
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
