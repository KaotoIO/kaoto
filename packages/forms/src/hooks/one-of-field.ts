import { useContext, useMemo, useState } from 'react';
import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';
import { getItemFromSchema, isDefined, setValue } from '../utils';
import { getAppliedSchemaIndex } from '../utils/get-applied-schema-index';
import { OneOfSchemas, getOneOfSchemaList } from '../utils/get-oneof-schema-list';
import { SchemaContext } from '../providers/SchemaProvider';
import { useFieldValue } from './field-value';

export const useOneOfField = (propName: string) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema, definitions } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const oneOfSchemas: OneOfSchemas[] = useMemo(
    () => getOneOfSchemaList(schema.oneOf ?? [], definitions),
    [definitions, schema.oneOf],
  );

  const appliedSchemaIndex = getAppliedSchemaIndex(value, oneOfSchemas, definitions);
  const presetSchema = appliedSchemaIndex === -1 ? undefined : oneOfSchemas[appliedSchemaIndex];
  const [selectedOneOfSchema, setSelectedOneOfSchema] = useState<OneOfSchemas | undefined>(presetSchema);

  const onSchemaChange = (schema?: OneOfSchemas) => {
    if (schema?.name === selectedOneOfSchema?.name) {
      return;
    }

    if (!isDefined(schema?.schema)) {
      if (isDefined(value) && typeof value === 'object') {
        selectedOneOfSchema?.schema.properties &&
          Object.keys(selectedOneOfSchema.schema.properties).forEach((prop) => delete value[prop]);
        onChange(value);
      }

      setSelectedOneOfSchema(schema);
      return;
    }

    let newValue = getItemFromSchema(schema?.schema, definitions);
    if (typeof newValue === 'object') {
      if (isDefined(value) && typeof value === 'object') {
        newValue = { ...value };
        selectedOneOfSchema?.schema.properties &&
          Object.keys(selectedOneOfSchema.schema.properties).forEach(
            (prop) => delete (newValue as Record<string, unknown>)[prop],
          );
      }

      schema.schema.properties && Object.keys(schema.schema.properties).forEach((prop) => setValue(newValue, prop, {}));
      onChange(newValue as Record<string, unknown>);
    }

    setSelectedOneOfSchema(schema);
  };

  let shouldRender = true;
  if (selectedTab === 'Modified') {
    const selectedOneOfSchemaProperty = selectedOneOfSchema?.schema.properties;
    if (!selectedOneOfSchemaProperty || !isDefined(value)) {
      shouldRender = false;
    }
  }

  return {
    selectedOneOfSchema,
    oneOfSchemas,
    onSchemaChange,
    shouldRender,
  };
};
