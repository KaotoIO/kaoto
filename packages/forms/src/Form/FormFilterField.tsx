import { Search } from '@carbon/react';
import { ChangeEvent, FunctionComponent, KeyboardEvent, useCallback, useContext, useState } from 'react';

import { FilteredFieldContext } from '../providers/filtered-field.provider';

interface FormFilterFieldProps {
  /**
   * Called when Escape is pressed while the search field is already empty.
   */
  onDismiss?: () => void;
}

export const FormFilterField: FunctionComponent<FormFilterFieldProps> = ({ onDismiss }) => {
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Escape') return;

      if (searchText === '') {
        /**
         * Carbon's Search always stops the Escape propagation, so it never reaches the canvas.
         * When the field is already empty, dismiss explicitly.
         * When it has content, Carbon's own handler clears it and the next Escape lands here.
         */
        event.stopPropagation();
        onDismiss?.();
      }
    },
    [searchText, onDismiss],
  );

  return (
    <Search
      className="kaoto-form-toolbar__search"
      labelText="Find properties by name"
      placeholder="Find properties by name"
      data-testid="filter-fields"
      value={searchText}
      onChange={handleSearchChange}
      onClear={handleSearchClear}
      onKeyDown={handleKeyDown}
    />
  );
};
