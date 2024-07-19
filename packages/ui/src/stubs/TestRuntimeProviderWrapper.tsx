import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IRuntimeContext, RuntimeContext } from '../providers/runtime.provider';
import { CatalogSchemaLoader } from '../utils';

interface TestRuntimeProviderWrapperResult extends IRuntimeContext {
  Provider: FunctionComponent<PropsWithChildren>;
}

export const TestRuntimeProviderWrapper = (): TestRuntimeProviderWrapperResult => {
  const catalogLibraryCasted = catalogLibrary as CatalogLibrary;
  const basePath = CatalogSchemaLoader.DEFAULT_CATALOG_PATH;
  const selectedCatalog = catalogLibraryCasted.definitions[0];
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
