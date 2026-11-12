import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  describe('Escape key', () => {
    it.each([
      { scenario: 'on an empty search field', text: '', escapes: 1, expectedDismissals: 1 },
      {
        scenario: 'on a field with content (clears the filter first)',
        text: 'period',
        escapes: 1,
        expectedDismissals: 0,
      },
      { scenario: 'a second time after the filter was cleared', text: 'period', escapes: 2, expectedDismissals: 1 },
    ])(
      'Escape $scenario calls onDismiss $expectedDismissals time(s)',
      async ({ text, escapes, expectedDismissals }) => {
        const onDismiss = vi.fn();
        render(
          <FilteredFieldProvider>
            <FormFilterField onDismiss={onDismiss} />
          </FilteredFieldProvider>,
        );

        const input = screen.getByTestId('filter-fields');
        if (text) {
          await userEvent.type(input, text);
          expect(input).toHaveValue(text);
        }

        for (let i = 0; i < escapes; i++) {
          fireEvent.keyDown(input, { key: 'Escape' });
          // Our handler returns early on non-empty content and Carbon clears the text
          if (i === 0 && text) {
            expect(input).toHaveValue('');
          }
        }

        expect(onDismiss).toHaveBeenCalledTimes(expectedDismissals);
      },
    );
  });
});
