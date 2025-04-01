import { render, screen, fireEvent, act } from '@testing-library/react';
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
  onChange: jest.fn(),
  onCleanInput: jest.fn(),
  'aria-label': 'Typeahead',
  'data-testid': 'typeahead',
};

describe('Typeahead', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  it('should renders the Typeahead component', async () => {
    const { container } = render(<Typeahead {...defaultProps} />);

    expect(container).toMatchSnapshot();
  });

  it('should renders the Typeahead component with disabled button', async () => {
    const { container } = render(<Typeahead {...defaultProps} disabled={true} />);

    expect(container).toMatchSnapshot();
  });

  it('should opens the dropdown when the toggle is clicked', async () => {
    render(<Typeahead {...defaultProps} />);
    const toggle = screen.getByLabelText('Typeahead toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(screen.getByTestId('typeahead-typeahead-select')).toBeInTheDocument();
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

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should calls onChange when an item is selected', async () => {
    render(<Typeahead {...defaultProps} />);
    const toggle = screen.getByLabelText('Typeahead toggle');

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
    render(<Typeahead {...defaultProps} />);
    const input = screen.getByPlaceholderText('Select or write an option');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Item 1' } });
    });

    const clearButton = screen.getByLabelText('Clear input value');
    fireEvent.click(clearButton);

    expect(defaultProps.onCleanInput).toHaveBeenCalled();
  });

  it('should allow users to create a new item if the onCreate callback is set', async () => {
    render(<Typeahead {...defaultProps} onCreate={jest.fn()} onCreatePrefix="multiverse" />);

    const input = screen.getByPlaceholderText('Select or write an option');
    await act(async () => {
      fireEvent.click(input);
    });

    expect(screen.getByText('Create new multiverse')).toBeInTheDocument();
  });

  it('should allow users to create a new item if the onCreate callback is set and there is a value', async () => {
    render(<Typeahead {...defaultProps} onCreate={jest.fn()} onCreatePrefix="brick" />);

    const input = screen.getByPlaceholderText('Select or write an option');
    await act(async () => {
      fireEvent.click(input);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'in the wall' } });
    });

    const createNewElement = screen.getByLabelText(`option ${CREATE_NEW_ITEM.toLocaleLowerCase()}`);

    expect(createNewElement).toBeInTheDocument();
    expect(createNewElement).toHaveTextContent("Create new brick 'in the wall'");
  });
});
