import { isDefined } from '@kaoto/forms';
import { ArrayFieldWrapper, FieldProps, KaotoForm, OneOfSchemas, SchemaList, useOneOfField } from '@kaoto/forms';
import { FunctionComponent, useEffect } from 'react';

interface EndpointFieldProps extends FieldProps {
  model: unknown;
  endpointType?: string;
  setEndpointType: (value: string) => void;
  onModelChange: (value: unknown) => void;
}

export const EndpointFieldInner: FunctionComponent<EndpointFieldProps> = ({
  propName,
  model,
  endpointType,
  setEndpointType,
  onModelChange,
}) => {
  const { selectedOneOfSchema, oneOfSchemas, onSchemaChange, shouldRender } = useOneOfField(propName);

  useEffect(() => {
    if (model !== undefined && endpointType !== undefined) {
      const selectedSchema = oneOfSchemas.find((schema) => schema.schema.name === endpointType);
      if (selectedSchema !== selectedOneOfSchema) {
        onSchemaChange(selectedSchema);
        onModelChange(model);
      }
    }
  }, [endpointType, model, oneOfSchemas, onSchemaChange, onModelChange, selectedOneOfSchema]);

  const onCleanInput = () => {
    onSchemaChange();
    onModelChange({});
  };

  const onHandleSchemaChange = (schema?: OneOfSchemas) => {
    setEndpointType(schema?.schema.name || '');
    onSchemaChange(schema);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <ArrayFieldWrapper
      propName={propName}
      type="object"
      title={selectedOneOfSchema?.name ?? 'Endpoint'}
      description={selectedOneOfSchema?.description}
      actions={
        <SchemaList
          aria-label="endpoint type list"
          data-testid="endpoint-type-list"
          propName={propName}
          selectedSchema={selectedOneOfSchema}
          schemas={oneOfSchemas}
          onChange={onHandleSchemaChange}
          onCleanInput={onCleanInput}
          placeholder="Select an endpoint type"
        />
      }
    >
      {isDefined(selectedOneOfSchema?.schema.properties) && (
        <KaotoForm
          data-testid="new-endpoint-form"
          schema={selectedOneOfSchema?.schema}
          model={model}
          onChange={onModelChange}
        />
      )}
    </ArrayFieldWrapper>
  );
};
