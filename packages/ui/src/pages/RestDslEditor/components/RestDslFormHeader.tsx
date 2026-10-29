import { Search } from '@carbon/react';
import { FilteredFieldContext } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useState } from 'react';

export const RestDslFormHeader: FunctionComponent = () => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  /**
   * `filteredFieldText` is debounced, so binding it directly to the input would
   * revert every keystroke until the debounce settles; keep the typed text locally
   */
  const [searchText, setSearchText] = useState(filteredFieldText);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(event.target.value);
      onFilterChange(event, event.target.value);
    },
    [onFilterChange],
  );

  const handleSearchClear = useCallback(() => {
    setSearchText('');
    onFilterChange(undefined, '');
  }, [onFilterChange]);

  return (
    <Search
      className="filter-fields"
      labelText="Find properties by name"
      placeholder="Find properties by name"
      data-testid="filter-fields"
      value={searchText}
      onChange={handleSearchChange}
      onClear={handleSearchClear}
      size="sm"
    />
  );
};
