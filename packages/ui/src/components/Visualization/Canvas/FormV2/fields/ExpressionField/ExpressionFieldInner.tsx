import { FunctionComponent } from 'react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AutoField } from '../AutoField';

interface ExpressionFieldInner extends FieldProps {
  schemas: KaotoSchemaDefinition['schema'][];
}

export const ExpressionFieldInner: FunctionComponent<ExpressionFieldInner> = ({ propName, required, schemas }) => {
  const [rootExpressionSchema] = schemas;

  return (
    <SchemaProvider schema={rootExpressionSchema}>
      <AutoField propName={propName} required={required} />
    </SchemaProvider>
  );
};
