import { InputGroup, InputGroupItem, InputGroupText } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { TypeaheadSelect, TypeaheadSelectOption } from './TypeaheadSelect';

type RootElementSelectProps = {
  rootElementOptions: RootElementOption[];
  selectedOption?: RootElementOption;
  onChange: (option: RootElementOption) => void;
};

const toOptionKey = (option: RootElementOption): string =>
  option.namespaceUri ? `{${option.namespaceUri}}${option.name}` : option.name;

export const RootElementSelect: FunctionComponent<RootElementSelectProps> = ({
  rootElementOptions,
  selectedOption,
  onChange,
}) => {
  const options: TypeaheadSelectOption[] = useMemo(
    () =>
      rootElementOptions.map((opt) => ({
        value: toOptionKey(opt),
        label: opt.name,
        description: opt.namespaceUri ? `Namespace URI: ${opt.namespaceUri}` : '',
      })),
    [rootElementOptions],
  );

  const selectedKey = selectedOption ? toOptionKey(selectedOption) : (options[0]?.value ?? '');

  const handleChange = useCallback(
    (value: string) => {
      const option = rootElementOptions.find((opt) => toOptionKey(opt) === value);
      if (option) onChange(option);
    },
    [rootElementOptions, onChange],
  );

  return (
    <InputGroup>
      <InputGroupText>Root element</InputGroupText>
      <InputGroupItem>
        <TypeaheadSelect
          value={selectedKey}
          onChange={handleChange}
          options={options}
          id="attach-schema-root-element"
          data-testid="attach-schema-root-element"
          ariaLabel="Attach schema / Choose Root Element"
        />
      </InputGroupItem>
    </InputGroup>
  );
};
