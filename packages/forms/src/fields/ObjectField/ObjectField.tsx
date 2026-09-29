import { Edit, TrashCan } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent, useContext, useState } from 'react';
import { useFieldValue } from '../../hooks/field-value';
import { FieldProps } from '../../models/typings';
import { SchemaContext } from '../../providers/SchemaProvider';
import { isDefined, ROOT_PATH } from '../../utils';
import { ArrayFieldWrapper } from '../ArrayField/ArrayFieldWrapper';
import { ObjectFieldGrouping } from './ObjectFieldGrouping';

export const ObjectField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<object>(propName);
  const [isExpanded, setIsExpanded] = useState(isDefined(value));
  const label = schema.title ?? propName.split('.').pop() ?? propName;

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

  if (propName === ROOT_PATH || (!schema.title && !isDefined(onRemoveProps))) {
    return <ObjectFieldGrouping propName={propName} />;
  }

  return (
    <ArrayFieldWrapper
      propName={propName}
      type="object"
      title={label}
      required={required}
      description={schema.description}
      defaultValue={schema.default}
      actions={
        <>
          {!isExpanded && (
            <IconButton kind="ghost" data-testid={`${propName}__set`} label="Set object" onClick={onSet}>
              <Edit />
            </IconButton>
          )}

          {isExpanded && (
            <IconButton kind="ghost" data-testid={`${propName}__remove`} label="Remove object" onClick={onRemove}>
              <TrashCan />
            </IconButton>
          )}
        </>
      }
    >
      {isExpanded && <ObjectFieldGrouping propName={propName} />}
    </ArrayFieldWrapper>
  );
};
