import { FunctionComponent } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { SchemaProvider } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { AutoField } from './AutoField';

interface AnyOfFieldProps extends FieldProps {
  anyOf: KaotoSchemaDefinition['schema']['anyOf'];
}

export const AnyOfField: FunctionComponent<AnyOfFieldProps> = ({ propName, anyOf }) => {
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
