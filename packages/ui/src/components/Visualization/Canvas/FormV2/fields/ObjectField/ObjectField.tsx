import { FunctionComponent, useContext, useMemo } from 'react';
import { isDefined, ROOT_PATH } from '../../../../../../utils';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { ObjectFieldInner } from './ObjectFieldInner';
import { TrashIcon } from '@patternfly/react-icons';
import { Button } from '@patternfly/react-core';
import { FieldWrapper } from '../FieldWrapper';

export const ObjectField: FunctionComponent<FieldProps> = ({ propName, onRemove }) => {
  const { schema } = useContext(SchemaContext);
  if (!isDefined(schema)) {
    throw new Error(`ObjectField: schema is not defined for ${propName}`);
  }

  const actions = useMemo(
    () => (
      <>
        {onRemove && (
          <Button
            variant="plain"
            aria-label="Remove object"
            title="Remove object"
            onClick={() => {
              onRemove(propName);
            }}
            icon={<TrashIcon />}
          />
        )}
      </>
    ),
    [onRemove, propName],
  );

  if (propName === ROOT_PATH || !schema.title) {
    return <ObjectFieldInner propName={propName} />;
  }

  return (
    <FieldWrapper
      propName={propName}
      type="object"
      title={schema.title}
      description={schema.description}
      defaultValue={schema.default}
      actions={actions}
    >
      <ObjectFieldInner propName={propName} />
    </FieldWrapper>
  );
};
