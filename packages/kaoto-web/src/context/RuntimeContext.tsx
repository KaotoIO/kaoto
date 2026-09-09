import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { createContext } from 'react';

export interface IRuntimeContext {
  basePath: string;
  catalogLibrary: CatalogLibrary | undefined;
  selectedCatalog: CatalogLibraryEntry | undefined;
  setSelectedCatalog: (catalog: CatalogLibraryEntry | undefined) => void;
}

export const RuntimeContext = createContext<IRuntimeContext | undefined>(undefined);
