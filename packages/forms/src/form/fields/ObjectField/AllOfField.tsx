import { FunctionComponent, useContext } from 'react';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../models/typings';
import { AutoField } from '../AutoField';

export const AllOfField: FunctionComponent<FieldProps> = ({ propName, required, onRemove }) => {
  const { schema } = useContext(SchemaContext);
  if (!Array.isArray(schema.allOf)) {
    throw new Error('AllOfField: allOf must be an array');
  }

  return (
    <>
      {schema.allOf.map((schema, index) => {
        return (
          <SchemaProvider key={index} schema={schema}>
            <AutoField propName={propName} required={required} onRemove={onRemove} />
          </SchemaProvider>
        );
      })}
    </>
  );
};
