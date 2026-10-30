import { InputGroup, InputGroupItem, InputGroupText } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { TypeaheadSelect, TypeaheadSelectOption } from './TypeaheadSelect';

type RootElementSelectProps = {
  rootElementOptions: RootElementOption[];
  selectedOption?: RootElementOption;
  onChange: (option: RootElementOption) => void;
  /** The entry schema file of the current document, used to mark indirectly-reached elements. */
  documentEntrySchemaFile?: string;
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
  documentEntrySchemaFile,
}) => {
  // Show file info when two or more options share the same element name (ambiguous names)
  // or when an element comes from an indirectly-reached schema (not the entry schema itself).
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
        const isAmbiguous = ambiguousNames.has(opt.name);
        const isIndirect =
          !!opt.entrySchemaFile && !!documentEntrySchemaFile && opt.entrySchemaFile !== documentEntrySchemaFile;
        if ((isAmbiguous || isIndirect) && opt.entrySchemaFile) {
          const fileLabel = isIndirect && !isAmbiguous ? `via ${opt.entrySchemaFile}` : `File: ${opt.entrySchemaFile}`;
          descParts.push(fileLabel);
        }
        if (opt.namespaceUri) {
          descParts.push(`Namespace: ${opt.namespaceUri}`);
        }
        return {
          value: toOptionKey(opt),
          label: opt.name,
          ...(descParts.length > 0 && { description: descParts.join(' | ') }),
        };
      }),
    [rootElementOptions, ambiguousNames, documentEntrySchemaFile],
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
