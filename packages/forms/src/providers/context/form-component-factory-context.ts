import { JSONSchema4 } from 'json-schema';
import { createContext, FunctionComponent } from 'react';
import { FieldProps } from '../../models';

export type FormComponentFactoryContextValue = (schema: JSONSchema4) => FunctionComponent<FieldProps>;

export const FormComponentFactoryContext = createContext<FormComponentFactoryContextValue | undefined>(undefined);
