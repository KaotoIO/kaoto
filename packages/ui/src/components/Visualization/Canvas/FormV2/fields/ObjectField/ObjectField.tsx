import { FunctionComponent, useContext } from 'react';
import { ROOT_PATH } from '../../../../../../utils';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { ObjectFieldInner } from './ObjectFieldInner';
import { ObjectFieldWrapper } from './ObjectFieldWrapper';

export const ObjectField: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema } = useContext(SchemaContext);
  if (!schema) {
    return <div>ObjectField - Schema not defined</div>;
  }

  if (propName === ROOT_PATH || !schema.title) {
    return <ObjectFieldInner propName={propName} />;
  }

  return (
    <ObjectFieldWrapper title={schema.title}>
      <ObjectFieldInner propName={propName} />
    </ObjectFieldWrapper>
  );
};
