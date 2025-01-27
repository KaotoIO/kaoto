import { createContext, FunctionComponent, PropsWithChildren, useCallback } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { StringField } from '../fields/StringField';
import { FieldProps } from '../typings';

type FormComponentFactoryContextValue = (schema: KaotoSchemaDefinition['schema']) => FunctionComponent<FieldProps>;

export const FormComponentFactoryContext = createContext<FormComponentFactoryContextValue | undefined>(undefined);

export const FormComponentFactoryProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const factory = useCallback<FormComponentFactoryContextValue>((schema) => {
    if (schema.format === 'password') {
      return PasswordField;
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
      return DisabledField;
    }

    return DisabledField;
  }, []);

  return <FormComponentFactoryContext.Provider value={factory}>{children}</FormComponentFactoryContext.Provider>;
};
