import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import { InputGroup, InputGroupItem, InputGroupText } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { RootElementOption } from '../../../../models/datamapper/document';

type RootElementSelectProps = {
  rootElementOptions: RootElementOption[];
  selectedOption?: RootElementOption;
  onChange: (option: RootElementOption) => void;
};

export const RootElementSelect: FunctionComponent<RootElementSelectProps> = ({
  rootElementOptions,
  selectedOption,
  onChange,
}) => {
  const items: TypeaheadItem[] = useMemo(
    () =>
      rootElementOptions.map((option) => ({
        name: option.name,
        value: option.name,
        description: option.namespaceUri ? `Namespace URI: ${option.namespaceUri}` : undefined,
      })),
    [rootElementOptions],
  );

  const selectedItem: TypeaheadItem | undefined = useMemo(() => {
    if (selectedOption) {
      return items.find((item) => item.name === selectedOption.name);
    }
    return items[0];
  }, [selectedOption, items]);

  const handleSelectionChange = useCallback(
    (item?: TypeaheadItem) => {
      if (!item?.value) return;
      const option = rootElementOptions.find((opt) => opt.name === item.value);
      if (option) onChange(option);
    },
    [rootElementOptions, onChange],
  );

  return (
    <InputGroup>
      <InputGroupText>Root element</InputGroupText>
      <InputGroupItem>
        <Typeahead
          id="attach-schema-root-element"
          data-testid="attach-schema-root-element"
          aria-label="Attach schema / Choose Root Element"
          placeholder={selectedItem?.name}
          selectedItem={selectedItem}
          onChange={handleSelectionChange}
          items={items}
        />
      </InputGroupItem>
    </InputGroup>
  );
};
