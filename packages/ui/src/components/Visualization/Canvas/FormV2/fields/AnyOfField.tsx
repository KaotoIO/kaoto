import { FunctionComponent, useContext } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { SchemaContext, SchemaProvider } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { AutoField } from './AutoField';

interface AnyOfFieldProps extends FieldProps {
  anyOf: KaotoSchemaDefinition['schema']['anyOf'];
}

export const AnyOfField: FunctionComponent<AnyOfFieldProps> = ({ propName, anyOf }) => {
  const { schema } = useContext(SchemaContext);

  if (!Array.isArray(schema.anyOf) || schema.anyOf.length === 0) {
    return null;
  } else if (!schema) {
    return <div>AnyOfField - Schema not defined</div>;
  }

  return (
    <>
      {anyOf?.map((schema, index) => {
        return (
          <SchemaProvider key={index} schema={schema}>
            <AutoField propName={propName} />
          </SchemaProvider>
        );
      })}
    </>
  );
};
