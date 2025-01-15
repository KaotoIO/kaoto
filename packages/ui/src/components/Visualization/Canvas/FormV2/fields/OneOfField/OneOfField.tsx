import { FunctionComponent, useContext, useMemo, useState } from 'react';
import { getAppliedSchemaIndexV2 } from '../../../../../../utils/get-applied-schema-index';
import { getOneOfSchemaListV2, OneOfSchemas } from '../../../../../../utils/get-oneof-schema-list';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AutoField } from '../AutoField';
import { SchemaList } from './SchemaList';

export const OneOfField: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema, definitions } = useContext(SchemaContext);
  const { value } = useFieldValue<unknown>(propName);

  const oneOfSchemas: OneOfSchemas[] = useMemo(
    () => getOneOfSchemaListV2(schema.oneOf ?? [], definitions),
    [definitions, schema.oneOf],
  );
  const appliedSchemaIndex = getAppliedSchemaIndexV2(value, oneOfSchemas, definitions);
  const presetSchema = appliedSchemaIndex === -1 ? undefined : oneOfSchemas[appliedSchemaIndex];
  const [selectedOneOfSchema, setSelectedOneOfSchema] = useState<OneOfSchemas | undefined>(presetSchema);

  return (
    <SchemaList
      propName={propName}
      selectedSchema={selectedOneOfSchema}
      schemas={oneOfSchemas}
      onChange={setSelectedOneOfSchema}
    >
      {selectedOneOfSchema && (
        <SchemaProvider schema={selectedOneOfSchema.schema}>
          <AutoField propName={propName} />
        </SchemaProvider>
      )}
    </SchemaList>
  );
};
