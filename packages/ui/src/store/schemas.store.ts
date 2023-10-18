import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { Schema } from '../models';

interface SchemasState {
  schemas: { [key: string]: Schema };
  setSchema: (schemaKey: string, schema: Schema) => void;
}

export const useSchemasStore = createWithEqualityFn<SchemasState>(
  (set) => ({
    schemas: {},
    setSchema: (schemaKey: string, schema: Schema) => {
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
