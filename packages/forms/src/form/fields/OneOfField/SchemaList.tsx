import { Stack } from '@carbon/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, PropsWithChildren, useCallback, useMemo } from 'react';
import { FieldProps } from '../../models/typings';
import { SimpleSelector } from '../../Typeahead/SimpleSelector';
import { Typeahead } from '../../Typeahead/Typeahead';
import { TypeaheadItem } from '../../Typeahead/Typeahead.types';
import { isDefined } from '../../utils';
import { OneOfSchemas } from '../../utils/get-oneof-schema-list';

interface SchemaList extends FieldProps {
  selectedSchema: OneOfSchemas | undefined;
  schemas: OneOfSchemas[];
  onChange: (schema: OneOfSchemas | undefined) => void;
  onCleanInput?: () => void;
  placeholder?: string;
}

export const SchemaList: FunctionComponent<PropsWithChildren<SchemaList>> = ({
  propName,
  selectedSchema,
  schemas,
  onChange,
  onCleanInput,
  placeholder,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  children,
}) => {
  const items: TypeaheadItem<JSONSchema4>[] = useMemo(
    () => schemas.map(({ name, description, schema }) => ({ name, description, value: schema })),
    [schemas],
  );
  const useTypeahead = items.length > 5;

  const selectedItem = useMemo(() => {
    if (!selectedSchema) {
      return undefined;
    }

    return items.find((item) => item.name === selectedSchema.name);
  }, [items, selectedSchema]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<OneOfSchemas>) => {
      if (!isDefined(item)) {
        onChange(undefined);
        return;
      }

      onChange({
        name: item.name,
        description: item.description,
        schema: item.value,
      });
    },
    [onChange],
  );

  return (
    <Stack gap={3}>
      <div role="group">
        {useTypeahead ? (
          <Typeahead
            aria-label={ariaLabel}
            data-testid={dataTestId}
            selectedItem={selectedItem}
            items={items}
            id={propName}
            placeholder={placeholder}
            onChange={onItemChange}
            onCleanInput={onCleanInput}
          />
        ) : (
          <SimpleSelector
            aria-label={ariaLabel}
            data-testid={dataTestId}
            selectedItem={selectedItem}
            items={items}
            id={propName}
            onChange={onItemChange}
          />
        )}
      </div>

      {children}
    </Stack>
  );
};
