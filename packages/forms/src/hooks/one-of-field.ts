import { useContext, useMemo, useState } from 'react';

import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';
import { SchemaContext } from '../providers/SchemaProvider';
import { getItemFromSchema, isDefined, setValue } from '../utils';
import { getAppliedSchemaIndex } from '../utils/get-applied-schema-index';
import { getOneOfSchemaList, OneOfSchemas } from '../utils/get-oneof-schema-list';
import { useFieldValue } from './field-value';

export const useOneOfField = (propName: string) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema, definitions } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<Record<string, unknown>>(propName);

  const oneOfSchemas: OneOfSchemas[] = useMemo(
    () => getOneOfSchemaList(schema.oneOf ?? [], definitions),
    [definitions, schema.oneOf],
  );

  const getPreset = (model: unknown) => ({
    index: getAppliedSchemaIndex(model, oneOfSchemas, definitions),
    hasValue: isDefined(model) && (typeof model !== 'object' || Object.keys(model as object).length > 0),
  });
  const preset = getPreset(value);
  const [selectedSchemaIndex, setSelectedSchemaIndex] = useState(preset.index);
  const [previousPreset, setPreviousPreset] = useState(preset);

  if (previousPreset.index !== preset.index || previousPreset.hasValue !== preset.hasValue) {
    setPreviousPreset(preset);
    setSelectedSchemaIndex(preset.index);
  }
  const selectedOneOfSchema = selectedSchemaIndex === -1 ? undefined : oneOfSchemas[selectedSchemaIndex];

  const onSchemaChange = (schema?: OneOfSchemas) => {
    if (schema?.name === selectedOneOfSchema?.name) {
      return;
    }

    if (!isDefined(schema?.schema)) {
      if (isDefined(value) && typeof value === 'object') {
        selectedOneOfSchema?.schema.properties &&
          Object.keys(selectedOneOfSchema.schema.properties).forEach((prop) => delete value[prop]);
        // Clearing an object may infer a fallback schema. Keep the explicit local
        // selection instead of treating that inferred change as an external update.
        setPreviousPreset(getPreset(value));
        onChange(value);
      }

      setSelectedSchemaIndex(-1);
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

      schema.schema.properties &&
        Object.keys(schema.schema.properties).forEach((prop) => {
          setValue(newValue, prop, {});
        });
      onChange(newValue as Record<string, unknown>);
    }

    setSelectedSchemaIndex(oneOfSchemas.findIndex((entry) => entry.schema === schema.schema));
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
