import { CanvasFormTabsProvider, FilteredFieldContext, FilteredFieldProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';

import { CanvasFormHeader } from './CanvasFormHeader';

/** Renders the debounced filter text so tests can assert what reaches the form */
const FilterProbe = () => {
  const { filteredFieldText } = useContext(FilteredFieldContext);
  return <span data-testid="filter-probe">{filteredFieldText}</span>;
};

describe('CanvasFormHeader', () => {
  it('renders correctly', async () => {
    const { asFragment } = render(
      <CanvasFormTabsProvider>
        <CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" />
      </CanvasFormTabsProvider>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it('keeps every typed character while the filter is being debounced', async () => {
    render(
      <FilteredFieldProvider>
        <CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" />
        <FilterProbe />
      </FilteredFieldProvider>,
    );

    const searchInput = screen.getByTestId('filter-fields');
    await userEvent.type(searchInput, 'name');

    expect(searchInput).toHaveValue('name');
    await waitFor(() => expect(screen.getByTestId('filter-probe')).toHaveTextContent('name'));
  });

  it('filters the fields through the form page object', async () => {
    render(
      <FilteredFieldProvider>
        <CanvasFormHeader nodeId="nodeId" title="title" iconUrl="test" />
        <FilterProbe />
      </FilteredFieldProvider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.filterFields('show all');

    expect(screen.getByTestId('filter-fields')).toHaveValue('show all');
    await waitFor(() => expect(screen.getByTestId('filter-probe')).toHaveTextContent('show all'));
  });
});
