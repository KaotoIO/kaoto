import { Button } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import { getObjectHash } from '../../../../../../camel-utils/camel-random-id';
import { getItemFromSchema, isDefined } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AutoField } from '../AutoField';
import { ArrayFieldWrapper } from './ArrayFieldWrapper';

export const ArrayField: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema, definitions } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<unknown[]>(propName);
  const [itemsHash, setItemsHash] = useState<string[]>([]);

  const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
  if (!isDefined(itemsSchema)) {
    throw new Error(`ArrayField: items schema is not defined for ${propName}`);
  }

  const onAdd = () => {
    const localValue = value ?? [];
    const newItem = getItemFromSchema(itemsSchema, definitions);
    onChange([newItem, ...localValue]);
  };

  const getRemoveFn = (index: number) => () => {
    if (!Array.isArray(value)) return;

    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  useEffect(() => {
    if (!Array.isArray(value)) return;

    Promise.all(value.map(getObjectHash)).then((hashes) => {
      setItemsHash(hashes);
    });
  }, [value]);

  return (
    <ArrayFieldWrapper
      type="array"
      title={schema.title ?? propName}
      description={schema.description}
      defaultValue={schema.default}
      actions={
        <Button variant="plain" aria-label="Add new item" title="Add new item" onClick={onAdd} icon={<PlusIcon />} />
      }
    >
      {itemsHash.map((hash, index) => {
        const onRemove = getRemoveFn(index);

        return (
          <SchemaProvider key={hash} schema={itemsSchema}>
            <AutoField propName={`${propName}.${index}`} onRemove={onRemove} />
          </SchemaProvider>
        );
      })}
    </ArrayFieldWrapper>
  );
};
