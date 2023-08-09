import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { CatalogTypes, ComponentsCatalog } from '../models';

interface ComponentsCatalogState {
  catalogs: ComponentsCatalog;
  setCatalog: (catalogKey: string, catalog: CatalogTypes) => void;
}

export const useComponentsCatalogStore = createWithEqualityFn<ComponentsCatalogState>(
  (set) => ({
    catalogs: {},
    setCatalog: (catalogKey: string, catalog: CatalogTypes) => {
      set((state) => ({
        catalogs: {
          ...state.catalogs,
          [catalogKey]: catalog,
        },
      }));
    },
  }),
  shallow,
);
