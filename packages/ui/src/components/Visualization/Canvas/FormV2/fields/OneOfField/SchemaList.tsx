import { FormGroup } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useMemo } from 'react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { isDefined } from '../../../../../../utils';
import { OneOfSchemas } from '../../../../../../utils/get-oneof-schema-list';
import { FieldProps } from '../../typings';
import { SimpleSelector } from './SimpleSelector';
import { Typeahead } from './Typeahead';
import { TypeaheadItem } from './Typeahead.types';

interface SchemaList extends FieldProps {
  selectedSchema: OneOfSchemas | undefined;
  schemas: OneOfSchemas[];
  onChange: (schema: OneOfSchemas | undefined) => void;
}

export const SchemaList: FunctionComponent<PropsWithChildren<SchemaList>> = ({
  propName,
  selectedSchema,
  schemas,
  onChange,
  children,
}) => {
  const items: TypeaheadItem<KaotoSchemaDefinition['schema']>[] = useMemo(
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
    <>
      <FormGroup isStack hasNoPaddingTop label={`OneOf ${propName}`} fieldId={propName} role="group">
        {useTypeahead && <Typeahead selectedItem={selectedItem} items={items} id={propName} onChange={onItemChange} />}
        {!useTypeahead && (
          <SimpleSelector selectedItem={selectedItem} items={items} id={propName} onChange={onItemChange} />
        )}
      </FormGroup>

      {children}
    </>
  );
};
