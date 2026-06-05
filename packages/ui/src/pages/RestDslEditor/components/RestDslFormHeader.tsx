import { FilteredFieldContext } from '@kaoto/forms';
import { SearchInput } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';

export const RestDslFormHeader: FunctionComponent = () => {
  const { filteredFieldText, onFilterChange } = useContext(FilteredFieldContext);

  return (
    <SearchInput
      className="filter-fields"
      placeholder="Find properties by name"
      data-testid="filter-fields"
      value={filteredFieldText}
      onChange={onFilterChange}
      onClear={onFilterChange}
    />
  );
};
