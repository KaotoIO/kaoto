import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { Schema } from '../models';

interface SchemasState {
  schemas: Schema[];
  setSchema: (schema: Schema) => void;
}

export const useSchemasStore = createWithEqualityFn<SchemasState>(
  (set) => ({
    schemas: [],
    setSchema: (schema: Schema) => {
      set((state) => ({
        schemas: [...state.schemas, schema],
      }));
    },
  }),
  shallow,
);
