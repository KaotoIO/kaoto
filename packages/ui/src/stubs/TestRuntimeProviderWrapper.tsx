import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { FunctionComponent, PropsWithChildren } from 'react';
import { IRuntimeContext, RuntimeContext } from '../providers/runtime.provider';
import { CatalogSchemaLoader } from '../utils';

interface TestRuntimeProviderWrapperResult extends IRuntimeContext {
  Provider: FunctionComponent<PropsWithChildren>;
}

export const TestRuntimeProviderWrapper = (): TestRuntimeProviderWrapperResult => {
  const basePath = CatalogSchemaLoader.DEFAULT_CATALOG_PATH;
  const catalogLibrary: CatalogLibrary = {
    name: 'Default Kaoto catalog',
    definitions: [
      {
        name: 'Camel Main 4.6.0',
        version: '4.6.0',
        runtime: 'Main',
        fileName: 'camel-main/4.6.0/index-4eebd78f619ebc595d6ee2aecd066049.json',
      },
      {
        name: 'Camel Quarkus 3.8.0',
        version: '3.8.0',
        runtime: 'Quarkus',
        fileName: 'camel-quarkus/3.8.0/index-4299a1eb1d45433b7f6362b514210370.json',
      },
      {
        name: 'Camel SpringBoot 4.6.0',
        version: '4.6.0',
        runtime: 'SpringBoot',
        fileName: 'camel-springboot/4.6.0/index-630d8399b32380f6a533bf97f5203eaf.json',
      },
    ],
  };
  const selectedCatalog = catalogLibrary.definitions[0];
  const setSelectedCatalog = jest.fn();

  const Provider: FunctionComponent<PropsWithChildren> = (props) => (
    <RuntimeContext.Provider
      key={Date.now()}
      value={{
        basePath,
        catalogLibrary,
        selectedCatalog,
        setSelectedCatalog,
      }}
    >
      {props.children}
    </RuntimeContext.Provider>
  );

  return { Provider, basePath, catalogLibrary, selectedCatalog, setSelectedCatalog };
};
