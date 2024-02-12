import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { KaotoSchemaDefinition } from '../models';

interface SchemasState {
  schemas: { [key: string]: KaotoSchemaDefinition };
  setSchema: (schemaKey: string, schema: KaotoSchemaDefinition) => void;
}

export const useSchemasStore = createWithEqualityFn<SchemasState>(
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
  shallow,
);
