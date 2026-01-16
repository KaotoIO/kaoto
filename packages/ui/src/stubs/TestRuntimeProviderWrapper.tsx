import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FunctionComponent, PropsWithChildren } from 'react';

import { IRuntimeContext, RuntimeContext } from '../providers/runtime.provider';
import { CatalogSchemaLoader } from '../utils';

interface TestRuntimeProviderWrapperResult extends IRuntimeContext {
  Provider: FunctionComponent<PropsWithChildren>;
}

export const TestRuntimeProviderWrapper = (
  catalogSelect?: (catalogLibrary: CatalogLibrary) => CatalogLibraryEntry | undefined,
): TestRuntimeProviderWrapperResult => {
  const catalogLibraryCasted = catalogLibrary as CatalogLibrary;
  const basePath = CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH;
  const selectedCatalog = (catalogSelect && catalogSelect(catalogLibraryCasted)) || catalogLibraryCasted.definitions[0];
  const setSelectedCatalog = jest.fn();

  const Provider: FunctionComponent<PropsWithChildren> = (props) => (
    <RuntimeContext.Provider
      key={Date.now()}
      value={{
        basePath,
        catalogLibrary: catalogLibraryCasted,
        selectedCatalog,
        setSelectedCatalog,
      }}
    >
      {props.children}
    </RuntimeContext.Provider>
  );

  return { Provider, basePath, catalogLibrary: catalogLibraryCasted, selectedCatalog, setSelectedCatalog };
};
