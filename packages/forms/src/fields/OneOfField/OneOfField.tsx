import { FunctionComponent, useContext } from 'react';
import { useOneOfField } from '../../hooks/one-of-field';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../models/typings';
import { AutoField } from '../AutoField';
import { SchemaList } from './SchemaList';
import { ArrayFieldWrapper } from '../ArrayField/ArrayFieldWrapper';

export const OneOfField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { selectedOneOfSchema, oneOfSchemas, onSchemaChange, shouldRender } = useOneOfField(propName);
  const { schema } = useContext(SchemaContext);
  let title = 'Type';
  switch (schema.format) {
    case 'dataFormatType':
      title = 'Data Format Type';
      break;
    case 'loadBalancerType':
      title = 'Load Balancer Type';
      break;
    case 'expression':
    case 'expressionProperty':
      title = 'Expression';
      break;
    case 'errorHandlerType':
      title = 'Error Handler Type';
      break;
  }

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
      title={selectedOneOfSchema?.name ?? title}
      description={selectedOneOfSchema?.description}
      actions={
        <SchemaList
          aria-label={`${propName} oneof list`}
          data-testid={`${propName}__oneof-list`}
          propName={propName}
          selectedSchema={selectedOneOfSchema}
          schemas={oneOfSchemas}
          onChange={onSchemaChange}
          onCleanInput={onCleanInput}
          placeholder={`Select or write the ${title}`}
        />
      }
    >
      {selectedOneOfSchema && (
        <SchemaProvider schema={selectedOneOfSchema.schema}>
          <AutoField propName={propName} required={required} />
        </SchemaProvider>
      )}
    </ArrayFieldWrapper>
  );
};
