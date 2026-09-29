import { ContentSwitcher, Switch } from '@carbon/react';
import { FunctionComponent, useCallback, useState } from 'react';
import { isDefined } from '../utils';
import { TypeaheadProps } from './Typeahead.types';

export const SimpleSelector: FunctionComponent<TypeaheadProps> = ({ selectedItem, items, onChange }) => {
  const [selected, setIsSelected] = useState<string | undefined>(selectedItem?.name);

  const onItemChanged = useCallback(
    (data: { name?: string | number }) => {
      const name = typeof data.name === 'string' ? data.name : undefined;
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
    <ContentSwitcher
      size="md"
      selectedIndex={items.findIndex((item) => item.name === selected)}
      onChange={onItemChanged}
    >
      {items.map((item) => (
        <Switch key={item.name} name={item.name} text={item.name} />
      ))}
    </ContentSwitcher>
  );
};
