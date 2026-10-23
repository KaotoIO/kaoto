import { JSONSchema4 } from 'json-schema';

import { TabKeys } from '../providers/canvas-form-tabs.provider';
import { isDefined } from './is-defined';
import { isFieldValueDefined } from './is-field-value-defined';

/**
 * Returns true when a field should be rendered for the given tab.
 * Mirrors the visibility logic in AutoField — keep in sync if AutoField changes.
 */
export const isFieldTabVisible = (
  schema: JSONSchema4,
  value: unknown,
  required: boolean,
  selectedTab: TabKeys,
): boolean => {
  if (selectedTab === 'All') return true;

  const isComplexFieldType =
    schema.type === 'object' || schema.type === 'array' || 'oneOf' in schema || 'anyOf' in schema;
  const isPropertiesField = schema.type === 'object' && Object.keys(schema?.properties ?? {}).length === 0;
  const shouldLoadField = required || (isDefined(value) && isComplexFieldType && !isPropertiesField);

  if (selectedTab === 'Required') return shouldLoadField;
  if (selectedTab === 'Modified') return isFieldValueDefined(schema.type, value);

  return true;
};
