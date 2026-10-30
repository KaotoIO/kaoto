import { InputGroup, InputGroupItem, InputGroupText } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo } from 'react';

import { RootElementOption } from '../../../../models/datamapper/document';
import { getFileName } from '../utils';
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

  // When multiple distinct file paths share the same basename (e.g. orders/schema.xsd vs invoices/schema.xsd),
  // retain their full path to allow users to distinguish them.
  const ambiguousFileNames = useMemo(() => {
    const fileNameToPaths = new Map<string, Set<string>>();
    for (const opt of rootElementOptions) {
      for (const file of [opt.declaringFile, opt.entrySchemaFile]) {
        if (!file) continue;
        const name = getFileName(file);
        const paths = fileNameToPaths.get(name) ?? new Set<string>();
        paths.add(file);
        fileNameToPaths.set(name, paths);
      }
    }
    const ambiguous = new Set<string>();
    for (const [name, paths] of fileNameToPaths.entries()) {
      if (paths.size > 1) {
        ambiguous.add(name);
      }
    }
    return ambiguous;
  }, [rootElementOptions]);

  const formatFile = useCallback(
    (file: string) => {
      const baseName = getFileName(file);
      return ambiguousFileNames.has(baseName) ? file : baseName;
    },
    [ambiguousFileNames],
  );

  const options: TypeaheadSelectOption[] = useMemo(
    () =>
      rootElementOptions.map((opt) => {
        const descParts: string[] = [];
        // declaringFile is only set when it differs from entrySchemaFile (element reached indirectly).
        if (opt.declaringFile) {
          const declaringFileName = formatFile(opt.declaringFile);
          const via = opt.entrySchemaFile ? ` (via ${formatFile(opt.entrySchemaFile)})` : '';
          descParts.push(`File: ${declaringFileName}${via}`);
        } else if (ambiguousNames.has(opt.name) && opt.entrySchemaFile) {
          descParts.push(`File: ${formatFile(opt.entrySchemaFile)}`);
        }
        if (opt.namespaceUri) {
          descParts.push(`Namespace URI: ${opt.namespaceUri}`);
        }
        // The file names stay searchable even when the description does not show them.
        const searchText = [opt.entrySchemaFile, opt.declaringFile]
          .filter((file): file is string => !!file)
          .map((file) => formatFile(file))
          .join(' ');
        return {
          value: toOptionKey(opt),
          label: opt.name,
          ...(descParts.length > 0 && { description: descParts.join(' | ') }),
          ...(searchText && { searchText }),
        };
      }),
    [rootElementOptions, ambiguousNames, formatFile],
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
