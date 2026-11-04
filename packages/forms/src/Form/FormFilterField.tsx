import { Search } from '@carbon/react';
import { ChangeEvent, FunctionComponent, useCallback, useContext, useState } from 'react';

import { FilteredFieldContext } from '../providers/filtered-field.provider';

export const FormFilterField: FunctionComponent = () => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);
  /**
   * `filteredFieldText` is debounced, so binding it directly to the input would
   * revert every keystroke until the debounce settles; keep the typed text locally
   */
  const [searchText, setSearchText] = useState(filteredFieldText);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
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
      className="kaoto-form-toolbar__search"
      labelText="Find properties by name"
      placeholder="Find properties by name"
      data-testid="filter-fields"
      value={searchText}
      onChange={handleSearchChange}
      onClear={handleSearchClear}
    />
  );
};
