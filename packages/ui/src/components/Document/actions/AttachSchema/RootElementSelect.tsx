import { InputGroup, InputGroupItem, InputGroupText } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { TypeaheadSelect, TypeaheadSelectOption } from './TypeaheadSelect';

type RootElementSelectProps = {
  rootElementOptions: RootElementOption[];
  selectedOption?: RootElementOption;
  onChange: (option: RootElementOption) => void;
};

const toOptionKey = (option: RootElementOption): string => {
  const filePrefix = option.entrySchemaFile ? `${option.entrySchemaFile}#` : '';
  const nsSegment = option.namespaceUri ? `{${option.namespaceUri}}` : '';
  return `${filePrefix}${nsSegment}${option.name}`;
};

export const RootElementSelect: FunctionComponent<RootElementSelectProps> = ({
  rootElementOptions,
  selectedOption,
  onChange,
}) => {
  // Show the file when two or more options share the same element name (ambiguous names), and always for elements
  // declared in a file other than their entry schema: "File: <declaringFile> (via <entry>)".
  const ambiguousNames = useMemo(() => {
    const nameCounts = new Map<string, number>();
    for (const opt of rootElementOptions) {
      nameCounts.set(opt.name, (nameCounts.get(opt.name) ?? 0) + 1);
    }
    return new Set(
      Array.from(nameCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    );
  }, [rootElementOptions]);

  const options: TypeaheadSelectOption[] = useMemo(
    () =>
      rootElementOptions.map((opt) => {
        const descParts: string[] = [];
        // declaringFile is only set when it differs from entrySchemaFile (element reached indirectly).
        if (opt.declaringFile) {
          const via = opt.entrySchemaFile ? ` (via ${opt.entrySchemaFile})` : '';
          descParts.push(`File: ${opt.declaringFile}${via}`);
        } else if (ambiguousNames.has(opt.name) && opt.entrySchemaFile) {
          descParts.push(`File: ${opt.entrySchemaFile}`);
        }
        if (opt.namespaceUri) {
          descParts.push(`Namespace URI: ${opt.namespaceUri}`);
        }
        return {
          value: toOptionKey(opt),
          label: opt.name,
          ...(descParts.length > 0 && { description: descParts.join(' | ') }),
        };
      }),
    [rootElementOptions, ambiguousNames],
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
