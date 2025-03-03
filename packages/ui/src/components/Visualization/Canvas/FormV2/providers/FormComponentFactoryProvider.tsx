import { createContext, FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { EnumField } from '../fields/EnumField';
import { ExpressionField } from '../fields/ExpressionField/ExpressionField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { PropertiesField } from '../fields/PropertiesField/PropertiesField';
import { StringField } from '../fields/StringField';
import { TextAreaField } from '../fields/TextAreaField';
import { FieldProps } from '../typings';
import { BeanField } from '../fields/BeanField';

type FormComponentFactoryContextValue = (schema: KaotoSchemaDefinition['schema']) => FunctionComponent<FieldProps>;

/* Name of the properties that should load TextAreaField */
const TextAreaPropertyNames = ['Expression', 'Description', 'Query', 'Script'];

export const FormComponentFactoryContext = createContext<FormComponentFactoryContextValue | undefined>(undefined);

export const FormComponentFactoryProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const factory = useCallback<FormComponentFactoryContextValue>((schema) => {
    if (schema.format === 'password') {
      return PasswordField;
    } else if (schema.type === 'string' && schema.title && TextAreaPropertyNames.includes(schema.title)) {
      return TextAreaField;
    } else if (schema.type === 'string' && Array.isArray(schema.enum)) {
      return EnumField;
    } else if (schema.type === 'object' && Object.keys(schema?.properties ?? {}).length === 0) {
      /*
       * If the object has no properties, we render a generic key-value pairs field
       * This is useful for langchain4j-tools consumer components or when configuring beans entities
       */
      return PropertiesField;
    } else if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
      return BeanField;
    } else if (schema.format === 'expression' || schema.format === 'expressionProperty') {
      return ExpressionField;
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
    } else if (Array.isArray(schema.anyOf)) {
      throw new Error('FormComponentFactoryProvider: AnyOf should be handled in the scope of the ObjectField');
    }

    return DisabledField;
  }, []);

  return <FormComponentFactoryContext.Provider value={factory}>{children}</FormComponentFactoryContext.Provider>;
};
