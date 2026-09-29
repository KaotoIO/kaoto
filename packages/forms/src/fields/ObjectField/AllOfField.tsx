import { FunctionComponent, useContext } from 'react';

import { FieldProps } from '../../models/typings';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { AutoField } from '../AutoField';

export const AllOfField: FunctionComponent<FieldProps> = ({ propName, required, onRemove }) => {
  const { schema } = useContext(SchemaContext);
  if (!Array.isArray(schema.allOf)) {
    throw new Error('AllOfField: allOf must be an array');
  }

  return (
    <>
      {schema.allOf.map((schema, index) => {
        const key = schema.$ref ?? schema.title ?? `${schema.type ?? 'schema'}-${index}`;
        return (
          <SchemaProvider key={String(key)} schema={schema}>
            <AutoField propName={propName} required={required} onRemove={onRemove} />
          </SchemaProvider>
        );
      })}
    </>
  );
};
