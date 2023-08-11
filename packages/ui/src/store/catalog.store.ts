import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { CatalogTypes, ComponentsCatalog } from '../models';

interface CatalogState {
  catalogs: ComponentsCatalog;
  setCatalog: (catalogKey: string, catalog: CatalogTypes) => void;
}

export const useCatalogStore = createWithEqualityFn<CatalogState>(
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
