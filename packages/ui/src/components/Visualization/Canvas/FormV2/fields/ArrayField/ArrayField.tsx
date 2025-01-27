import { Button } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import { getObjectHash } from '../../../../../../camel-utils/camel-random-id';
import { getItemFromSchema, isDefined } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AutoField } from '../AutoField';
import { FieldWrapper } from '../FieldWrapper';

export const ArrayField: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema, definitions } = useContext(SchemaContext);
  const { value = [], onChange } = useFieldValue<unknown[]>(propName);
  const [itemsHash, setItemsHash] = useState<string[]>([]);

  const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
  if (!isDefined(itemsSchema)) {
    throw new Error(`ArrayField: items schema is not defined for ${propName}`);
  }

  const onAdd = () => {
    const newItem = getItemFromSchema(itemsSchema, definitions);
    onChange([newItem, ...value]);
  };

  const getRemoveFn = (index: number) => () => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  useEffect(() => {
    Promise.all(value.map(getObjectHash)).then((hashes) => {
      setItemsHash(hashes);
    });
  }, [value]);

  return (
    <FieldWrapper
      propName={propName}
      type="array"
      title={schema.title}
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
    </FieldWrapper>
  );
};
