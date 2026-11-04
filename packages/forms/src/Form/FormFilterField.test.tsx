import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent, useContext } from 'react';

import { FilteredFieldContext, FilteredFieldProvider } from '../providers/filtered-field.provider';
import { FormFilterField } from './FormFilterField';

/** Renders the debounced filter text so tests can assert what reaches the form */
const FilterProbe: FunctionComponent = () => {
  const { filteredFieldText } = useContext(FilteredFieldContext);
  return <span data-testid="filter-probe">{filteredFieldText}</span>;
};

describe('FormFilterField', () => {
  it('keeps every typed character while the filter is being debounced', async () => {
    render(
      <FilteredFieldProvider>
        <FormFilterField />
        <FilterProbe />
      </FilteredFieldProvider>,
    );

    const searchInput = screen.getByTestId('filter-fields');
    await userEvent.type(searchInput, 'name');

    expect(searchInput).toHaveValue('name');
    await waitFor(() => expect(screen.getByTestId('filter-probe')).toHaveTextContent('name'));
  });

  it('clears the filter', async () => {
    render(
      <FilteredFieldProvider>
        <FormFilterField />
        <FilterProbe />
      </FilteredFieldProvider>,
    );

    const searchInput = screen.getByTestId('filter-fields');
    await userEvent.type(searchInput, 'name');
    await waitFor(() => expect(screen.getByTestId('filter-probe')).toHaveTextContent('name'));

    await userEvent.click(screen.getByRole('button', { name: 'Clear search input' }));

    expect(searchInput).toHaveValue('');
    await waitFor(() => expect(screen.getByTestId('filter-probe')).toHaveTextContent(''));
  });
});
