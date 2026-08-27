import {
  ArrayFieldWrapper,
  FieldProps,
  isDefined,
  ModelContext,
  ModelContextProvider,
  ObjectFieldGrouping,
  SchemaList,
  SchemaProvider,
  useFieldValue,
  useOneOfField,
} from '@kaoto/forms';
import { Checkbox } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';

interface ExpressionFieldInnerProps extends FieldProps {
  /**
   * Toggles the intentional empty-string state of the expression value at the given model path.
   * Provided by `ExpressionFieldImpl` so the write bypasses the whitespace-only cleanup applied
   * by `onPropertyChange`.
   */
  onToggleEmpty: (path: string, isEmptyValue: boolean) => void;
}

export const ExpressionFieldInner: FunctionComponent<ExpressionFieldInnerProps> = ({ propName, onToggleEmpty }) => {
  const { selectedOneOfSchema, oneOfSchemas, onSchemaChange, shouldRender } = useOneOfField(propName);
  const { value } = useFieldValue<Record<string, unknown>>(propName);
  const parentModelContext = useContext(ModelContext);

  const languageName = selectedOneOfSchema ? Object.keys(selectedOneOfSchema.schema.properties ?? {})[0] : undefined;
  const isExpressionEmpty =
    isDefined(languageName) && (value?.[languageName] as Record<string, unknown> | undefined)?.expression === '';

  const onEmptyCheckboxChange = (_event: unknown, checked: boolean) => {
    if (!isDefined(languageName)) {
      return;
    }

    onToggleEmpty(`${languageName}.expression`, checked);
  };

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
        <>
          <Checkbox
            id={`${propName}-expression-empty`}
            label="Empty"
            isChecked={isExpressionEmpty}
            isDisabled={!isDefined(selectedOneOfSchema) || parentModelContext.disabled}
            onChange={onEmptyCheckboxChange}
            data-testid={`${propName}__expression-empty-checkbox`}
          />
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
        </>
      }
    >
      <ModelContextProvider {...parentModelContext} disabled={isExpressionEmpty || parentModelContext.disabled}>
        {isDefined(selectedOneOfSchema?.schema.properties) &&
          Object.entries(selectedOneOfSchema.schema.properties).map(([propertyName, propertyValue]) => {
            return (
              <SchemaProvider key={propertyName} schema={propertyValue}>
                <ObjectFieldGrouping propName={propertyName} />
              </SchemaProvider>
            );
          })}
      </ModelContextProvider>
    </ArrayFieldWrapper>
  );
};
