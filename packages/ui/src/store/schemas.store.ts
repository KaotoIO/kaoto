import type {} from '@redux-devtools/extension'; // required for devtools typing
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { KaotoSchemaDefinition } from '../models';

interface SchemasState {
  schemas: { [key: string]: KaotoSchemaDefinition };
  setSchema: (schemaKey: string, schema: KaotoSchemaDefinition) => void;
}

export const useSchemasStore = create<SchemasState>()(
  devtools(
    (set) => ({
      schemas: {},
      setSchema: (schemaKey: string, schema: KaotoSchemaDefinition) => {
        set((state) => ({
          schemas: {
            ...state.schemas,
            [schemaKey]: schema,
          },
        }));
      },
    }),
    { name: 'Schemas store' },
  ),
);
