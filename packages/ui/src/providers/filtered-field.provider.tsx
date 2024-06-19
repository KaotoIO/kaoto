import { FunctionComponent, PropsWithChildren, createContext, useCallback } from 'react';
import { useDebounceValue } from 'usehooks-ts';

export interface FilteredFieldContextResult {
  filteredFieldText: string;
  onFilterChange: (_event: unknown, value?: string) => void;
  isGroupExpanded: boolean;
}
export const FilteredFieldContext = createContext<FilteredFieldContextResult>({
  filteredFieldText: '',
  onFilterChange: () => {},
  isGroupExpanded: false,
});

/**
 * Used for fetching and injecting the filtered text from the canvas form
 */
export const FilteredFieldProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [searchTerm, setSearchTerm] = useDebounceValue('', 500, { trailing: true });
  const onFilterChange = useCallback(
    (_event: unknown, value = '') => {
      setSearchTerm(value);
    },
    [setSearchTerm],
  );

  return (
    <FilteredFieldContext.Provider
      value={{
        filteredFieldText: searchTerm,
        onFilterChange,
        isGroupExpanded: searchTerm.length > 0,
      }}
    >
      {props.children}
    </FilteredFieldContext.Provider>
  );
};
