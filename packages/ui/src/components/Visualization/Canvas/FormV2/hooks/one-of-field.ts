import { useContext, useMemo, useState } from 'react';
import { CanvasFormTabsContext } from '../../../../../providers';
import { isDefined } from '../../../../../utils';
import { getAppliedSchemaIndexV2 } from '../../../../../utils/get-applied-schema-index';
import { OneOfSchemas, getOneOfSchemaListV2 } from '../../../../../utils/get-oneof-schema-list';
import { SchemaContext } from '../providers/SchemaProvider';
import { useFieldValue } from './field-value';

export const useOneOfField = (propName: string) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema, definitions } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const oneOfSchemas: OneOfSchemas[] = useMemo(
    () => getOneOfSchemaListV2(schema.oneOf ?? [], definitions),
    [definitions, schema.oneOf],
  );

  const appliedSchemaIndex = getAppliedSchemaIndexV2(value, oneOfSchemas, definitions);
  const presetSchema = appliedSchemaIndex === -1 ? undefined : oneOfSchemas[appliedSchemaIndex];
  const [selectedOneOfSchema, setSelectedOneOfSchema] = useState<OneOfSchemas | undefined>(presetSchema);

  const onSchemaChange = (schema?: OneOfSchemas) => {
    if (schema?.name === selectedOneOfSchema?.name) {
      return;
    }

    if (typeof value === 'object' && isDefined(selectedOneOfSchema?.schema.properties)) {
      const newValue = { ...value };
      Object.keys(selectedOneOfSchema.schema.properties).forEach((prop) => {
        delete (newValue as Record<string, unknown>)[prop];
      });
      onChange(newValue);
    }

    setSelectedOneOfSchema(schema);
  };

  let shouldRender = true;
  if (selectedTab === 'Modified') {
    const selectedOneOfSchemaProperty = selectedOneOfSchema?.schema.properties;
    if (selectedOneOfSchemaProperty) {
      const hasModelDefined = Object.keys(selectedOneOfSchemaProperty).some(
        (propName) => isDefined(value) && isDefined(value[propName]),
      );
      if (!hasModelDefined) {
        shouldRender = false;
      }
    }
  }

  return {
    selectedOneOfSchema,
    oneOfSchemas,
    onSchemaChange,
    shouldRender,
  };
};
