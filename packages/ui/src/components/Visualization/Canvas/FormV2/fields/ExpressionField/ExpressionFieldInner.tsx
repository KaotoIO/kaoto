import { FunctionComponent } from 'react';
import { isDefined } from '../../../../../../utils';
import { useOneOfField } from '../../hooks/one-of-field';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { ArrayFieldWrapper } from '../ArrayField/ArrayFieldWrapper';
import { ObjectFieldGrouping } from '../ObjectField/ObjectFieldGrouping';
import { SchemaList } from '../OneOfField/SchemaList';

export const ExpressionFieldInner: FunctionComponent<FieldProps> = ({ propName }) => {
  const { selectedOneOfSchema, oneOfSchemas, onSchemaChange, shouldRender } = useOneOfField(propName);

  const onCleanInput = () => {
    onSchemaChange();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <ArrayFieldWrapper
      propName={propName}
      type="expression"
      title={selectedOneOfSchema?.name ?? 'Expression'}
      description={selectedOneOfSchema?.description}
      actions={
        <SchemaList
          propName={propName}
          selectedSchema={selectedOneOfSchema}
          schemas={oneOfSchemas}
          onChange={onSchemaChange}
          onCleanInput={onCleanInput}
          placeholder="Select or write an expression"
        />
      }
    >
      {isDefined(selectedOneOfSchema?.schema.properties) &&
        Object.entries(selectedOneOfSchema.schema.properties).map(([propertyName, propertyValue]) => {
          return (
            <SchemaProvider key={propertyName} schema={propertyValue}>
              <ObjectFieldGrouping propName={propertyName} />
            </SchemaProvider>
          );
        })}
    </ArrayFieldWrapper>
  );
};
