import { FilteredFieldContext } from '@kaoto/forms';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { RestDslFormHeader } from './RestDslFormHeader';

describe('RestDslFormHeader', () => {
  it('should render the search input', () => {
    const mockFilteredFieldContext = {
      filteredFieldText: '',
      onFilterChange: vi.fn(),
      isGroupExpanded: false,
    };

    render(
      <FilteredFieldContext.Provider value={mockFilteredFieldContext}>
        <RestDslFormHeader />
      </FilteredFieldContext.Provider>,
    );

    const searchInput = screen.getByTestId('filter-fields');
    expect(searchInput).toBeInTheDocument();
  });

  it('should display the filtered text from context', () => {
    const mockFilteredFieldContext = {
      filteredFieldText: 'test search',
      onFilterChange: vi.fn(),
      isGroupExpanded: false,
    };

    render(
      <FilteredFieldContext.Provider value={mockFilteredFieldContext}>
        <RestDslFormHeader />
      </FilteredFieldContext.Provider>,
    );

    const searchInput = screen.getByLabelText('Search input') as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.value).toBe('test search');
  });

  it('should call onFilterChange when input changes', async () => {
    const user = userEvent.setup();
    const mockOnFilterChange = vi.fn();
    const mockFilteredFieldContext = {
      filteredFieldText: '',
      onFilterChange: mockOnFilterChange,
      isGroupExpanded: false,
    };

    render(
      <FilteredFieldContext.Provider value={mockFilteredFieldContext}>
        <RestDslFormHeader />
      </FilteredFieldContext.Provider>,
    );

    const searchInput = screen.getByLabelText('Search input');
    await user.type(searchInput, 'test');

    expect(mockOnFilterChange).toHaveBeenCalled();
  });

  it('should call onFilterChange when reset button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnFilterChange = vi.fn();
    const mockFilteredFieldContext = {
      filteredFieldText: 'test search',
      onFilterChange: mockOnFilterChange,
      isGroupExpanded: false,
    };

    render(
      <FilteredFieldContext.Provider value={mockFilteredFieldContext}>
        <RestDslFormHeader />
      </FilteredFieldContext.Provider>,
    );

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect(mockOnFilterChange).toHaveBeenCalled();
  });
});
