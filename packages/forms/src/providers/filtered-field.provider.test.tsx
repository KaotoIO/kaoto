import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { FilteredFieldContext, FilteredFieldProvider } from './filtered-field.provider';

describe('FilteredFieldProvider', () => {
  it('should provide the default context values', async () => {
    render(
      <FilteredFieldProvider>
        <TestComponent />
      </FilteredFieldProvider>,
    );

    const inputField = screen.getByTestId('input') as HTMLInputElement;
    const isGroupExpanded = screen.getByTestId('isGroupExpanded');

    expect(inputField.value).toBe('');
    expect(isGroupExpanded.textContent).toBe('false');
  });

  it('should update the context values when the input changes', async () => {
    render(
      <FilteredFieldProvider>
        <TestComponent />
      </FilteredFieldProvider>,
    );
    const inputField = screen.getByTestId('input') as HTMLInputElement;
    const isGroupExpanded = screen.getByTestId('isGroupExpanded');

    fireEvent.input(inputField, { target: { value: 'test' } });

    await waitFor(() => expect(inputField.value).toBe('test'));
    expect(isGroupExpanded.textContent).toBe('true');
  });
});

const TestComponent = () => {
  const { filteredFieldText, onFilterChange, isGroupExpanded } = useContext(FilteredFieldContext)!;

  return (
    <div>
      <input
        type="text"
        value={filteredFieldText}
        onChange={(event) => onFilterChange(null, event.target.value)}
        title="Filter"
        data-testid="input"
      />
      <span data-testid="isGroupExpanded">{isGroupExpanded ? 'true' : 'false'}</span>
    </div>
  );
};
