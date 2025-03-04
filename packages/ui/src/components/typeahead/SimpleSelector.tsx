import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import {
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useState,
} from 'react';
import { isDefined } from '../../utils';
import { TypeaheadProps } from './Typeahead.types';

export const SimpleSelector: FunctionComponent<TypeaheadProps> = ({
  selectedItem,
  items,
  id,
  onChange,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}) => {
  const [selected, setIsSelected] = useState<string | undefined>(selectedItem?.name);

  const onItemChanged = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: ReactMouseEvent<any> | ReactKeyboardEvent | MouseEvent) => {
      const name = event.currentTarget?.id;
      setIsSelected(name);

      if (!isDefined(name)) {
        onChange?.(undefined);
        return;
      }

      const localItem = items.find((item) => item.name === name);

      if (name !== selectedItem?.name) {
        onChange?.(localItem);
      }
    },
    [onChange, items, selectedItem?.name],
  );

  return (
    <ToggleGroup id={id} data-testid={dataTestId} aria-label={ariaLabel}>
      {items.map((item) => (
        <ToggleGroupItem
          key={item.name}
          text={item.name}
          buttonId={item.name}
          isSelected={selected === item.name}
          onChange={onItemChanged}
        />
      ))}
    </ToggleGroup>
  );
};
