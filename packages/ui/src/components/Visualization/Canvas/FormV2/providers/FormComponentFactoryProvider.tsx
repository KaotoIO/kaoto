import { createContext, FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { EnumField } from '../fields/EnumField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { PropertiesField } from '../fields/PropertiesField/PropertiesField';
import { StringField } from '../fields/StringField';
import { TextAreaField } from '../fields/TextAreaField';
import { FieldProps } from '../typings';

type FormComponentFactoryContextValue = (schema: KaotoSchemaDefinition['schema']) => FunctionComponent<FieldProps>;

/* Name of the properties that should load TextAreaField */
const TextAreaPropertyNames = ['Expression', 'Description', 'Query'];

export const FormComponentFactoryContext = createContext<FormComponentFactoryContextValue | undefined>(undefined);

export const FormComponentFactoryProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const factory = useCallback<FormComponentFactoryContextValue>((schema) => {
    const propertiesCount = Object.keys(schema.properties ?? {}).length;

    if (schema.format === 'password') {
      return PasswordField;
    } else if (schema.type === 'string' && schema.title && TextAreaPropertyNames.includes(schema.title)) {
      return TextAreaField;
    } else if (schema.type === 'string' && Array.isArray(schema.enum)) {
      return EnumField;
    } else if (schema.type === 'object' && propertiesCount === 0) {
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
    } else if (Array.isArray(schema.anyOf)) {
      throw new Error('FormComponentFactoryProvider: AnyOf should be handled in the scope of the ObjectField');
    }

    return DisabledField;
  }, []);

  return <FormComponentFactoryContext.Provider value={factory}>{children}</FormComponentFactoryContext.Provider>;
};
