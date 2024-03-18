import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { ComponentType, createElement } from 'react';
import { useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models';

export type AutoFieldsProps = {
  autoField?: ComponentType<{ name: string }>;
  element?: ComponentType | string;
  fields?: string[];
  omitFields?: string[];
};

export function CustomAutoFields({
  autoField = AutoField,
  element = 'div',
  fields,
  omitFields = [],
  ...props
}: AutoFieldsProps) {
  const { schema } = useForm();
  const rootField = schema.getField('');

  /** Special handling for oneOf schemas */
  if (Array.isArray((rootField as KaotoSchemaDefinition['schema']).oneOf)) {
    return createElement(element, props, [createElement(autoField!, { key: '', name: '' })]);
  }

  return createElement(
    element,
    props,
    (fields ?? schema.getSubfields())
      .filter((field) => !omitFields!.includes(field))
      .map((field) => createElement(autoField!, { key: field, name: field })),
  );
}
