import { Button } from '@patternfly/react-core';
import { PencilAltIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useState } from 'react';
import { isDefined, ROOT_PATH } from '../../../../../../utils';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { ArrayFieldWrapper } from '../ArrayField/ArrayFieldWrapper';
import { ObjectFieldGrouping } from './ObjectFieldGrouping';

export const ObjectField: FunctionComponent<FieldProps> = ({ propName, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<object>(propName);
  const [isExpanded, setIsExpanded] = useState(isDefined(value));

  if (!isDefined(schema)) {
    throw new Error(`ObjectField: schema is not defined for ${propName}`);
  }

  const onSet = () => {
    setIsExpanded(true);
  };

  const onRemove = () => {
    if (isDefined(onRemoveProps)) {
      onRemoveProps(propName);
      return;
    }

    /** Clear field by removing its value */
    onChange(undefined as unknown as object);
    setIsExpanded(false);
  };

  if (propName === ROOT_PATH || !schema.title) {
    return <ObjectFieldGrouping propName={propName} />;
  }

  return (
    <ArrayFieldWrapper
      type="object"
      title={schema.title}
      description={schema.description}
      defaultValue={schema.default}
      actions={
        <>
          {!isExpanded && (
            <Button
              variant="plain"
              aria-label="Set object"
              title="Set object"
              onClick={onSet}
              icon={<PencilAltIcon />}
            />
          )}

          {isExpanded && (
            <Button
              variant="plain"
              aria-label="Remove object"
              title="Remove object"
              onClick={onRemove}
              icon={<TrashIcon />}
            />
          )}
        </>
      }
    >
      {isExpanded && <ObjectFieldGrouping propName={propName} />}
    </ArrayFieldWrapper>
  );
};
