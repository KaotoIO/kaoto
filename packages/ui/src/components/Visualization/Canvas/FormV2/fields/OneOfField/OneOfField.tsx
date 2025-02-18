import { FunctionComponent } from 'react';
import { useOneOfField } from '../../hooks/one-of-field';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AutoField } from '../AutoField';
import { SchemaList } from './SchemaList';

export const OneOfField: FunctionComponent<FieldProps> = ({ propName }) => {
  const { selectedOneOfSchema, oneOfSchemas, onSchemaChange, shouldRender } = useOneOfField(propName);

  const onCleanInput = () => {
    onSchemaChange();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <SchemaList
      propName={propName}
      selectedSchema={selectedOneOfSchema}
      schemas={oneOfSchemas}
      onChange={onSchemaChange}
      onCleanInput={onCleanInput}
    >
      {selectedOneOfSchema && (
        <SchemaProvider schema={selectedOneOfSchema.schema}>
          <AutoField propName={propName} />
        </SchemaProvider>
      )}
    </SchemaList>
  );
};
