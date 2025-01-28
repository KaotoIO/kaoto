import { FunctionComponent, useContext } from 'react';
import { isDefined } from '../../../../../../utils';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AnyOfField } from '../AnyOfField';
import { AutoField } from '../AutoField';

export const ObjectFieldInner: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema } = useContext(SchemaContext);
  if (!schema) {
    return <div>ObjectField - Schema not defined</div>;
  }

  const requiredProperties = Array.isArray(schema.required) ? schema.required : [];

  return (
    <>
      {Object.entries(schema.properties ?? {})
        .filter(([_, propertySchema]) => {
          /** Remove empty properties like `csimple: {}` */
          return isDefined(propertySchema) && Object.keys(propertySchema).length > 0;
        })
        .map(([propertyName, propertySchema]) => {
          const name = `${propName}.${propertyName}`;
          const required = requiredProperties.includes(propertyName);

          return (
            <SchemaProvider key={name} schema={propertySchema}>
              <AutoField propName={name} required={required} />
            </SchemaProvider>
          );
        })}

      {Array.isArray(schema.anyOf) && <AnyOfField propName={propName} anyOf={schema.anyOf} />}
    </>
  );
};
