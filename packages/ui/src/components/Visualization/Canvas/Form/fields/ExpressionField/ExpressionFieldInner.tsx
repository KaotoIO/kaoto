import {
  ArrayFieldWrapper,
  FieldProps,
  isDefined,
  ObjectFieldGrouping,
  SchemaList,
  SchemaProvider,
  useOneOfField,
} from '@kaoto/forms';
import { FunctionComponent } from 'react';

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
          aria-label={`${propName} expression list`}
          data-testid={`${propName}__expression-list`}
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
