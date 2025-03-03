import { render, screen, fireEvent, act } from '@testing-library/react';
import { Typeahead } from './Typeahead';
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
  it('should renders the Typeahead component', () => {
    const { container } = render(<Typeahead {...defaultProps} />);
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
      fireEvent.change(input, { target: { value: 'Item 1' } });
    });
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('should display no items found when no items match the input value', async () => {
    render(<Typeahead {...defaultProps} />);
    const input = screen.getByPlaceholderText('Select or write an option');
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
});
