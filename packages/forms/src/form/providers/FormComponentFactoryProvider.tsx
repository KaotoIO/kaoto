import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { EnumField } from '../fields/EnumField';
import { AllOfField } from '../fields/ObjectField/AllOfField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { PropertiesField } from '../fields/PropertiesField/PropertiesField';
import { StringField } from '../fields/StringField';
import { TextAreaField } from '../fields/TextAreaField';
import { FieldProps } from '../models/typings';
import {
  FormComponentFactoryContext,
  FormComponentFactoryContextValue,
} from './context/form-component-factory-context';
import { IndexedValuesField } from '../fields/IndexedValuesField/IndexedValuesField';

export type CustomFieldsFactory = (schema: JSONSchema4) => FunctionComponent<FieldProps> | undefined;

interface IFormComponentFactoryProvider extends PropsWithChildren {
  /**
   * Factory function to override the Field selection algorithm.
   *
   * Should return a component receiving FieldProps as props, or undefined if no custom field is found.
   */
  customFieldsFactory?: CustomFieldsFactory;
}

export const FormComponentFactoryProvider: FunctionComponent<IFormComponentFactoryProvider> = ({
  customFieldsFactory,
  children,
}) => {
  const factory = useCallback<FormComponentFactoryContextValue>(
    (schema) => {
      const CustomField = customFieldsFactory?.(schema);
      if (CustomField) {
        return CustomField;
      }

      if (schema.format === 'password') {
        return PasswordField;
      } else if (schema.type === 'string' && schema.title && TEXT_AREA_PROPERTY_NAMES.includes(schema.title)) {
        return TextAreaField;
      } else if (schema.type === 'string' && Array.isArray(schema.enum)) {
        return EnumField;
      } else if (schema.type === 'object' && schema.title?.toLowerCase().includes('constructors')) {
        return IndexedValuesField;
      } else if (schema.type === 'object' && Object.keys(schema?.properties ?? {}).length === 0) {
        /*
         * If the object has no properties, we render a generic key-value pairs field
         * This is useful for langchain4j-tools consumer components or when configuring beans entities
         */
        return PropertiesField;
      }

      switch (schema.type) {
        case 'string':
        case 'number':
        case 'integer':
          return StringField;
        case 'boolean':
          return BooleanField;
        case 'object':
          return ObjectField;
        case 'array':
          return ArrayField;
      }

      if (Array.isArray(schema.oneOf)) {
        return OneOfField;
      } else if (Array.isArray(schema.allOf)) {
        return AllOfField;
      } else if (Array.isArray(schema.anyOf)) {
        throw new Error('FormComponentFactoryProvider: AnyOf should be handled in the scope of the ObjectField');
      }

      return DisabledField;
    },
    [customFieldsFactory],
  );

  return <FormComponentFactoryContext.Provider value={factory}>{children}</FormComponentFactoryContext.Provider>;
};

/* Name of the properties that should load TextAreaField */
const TEXT_AREA_PROPERTY_NAMES = ['Expression', 'Description', 'Query', 'Script'];
