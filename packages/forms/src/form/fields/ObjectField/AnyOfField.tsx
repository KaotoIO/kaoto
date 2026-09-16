import { JSONSchema4 } from 'json-schema';
import { FunctionComponent } from 'react';
import { FieldProps } from '../../models/typings';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { AutoField } from '../AutoField';

interface AnyOfFieldProps extends FieldProps {
  anyOf: JSONSchema4['anyOf'];
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
