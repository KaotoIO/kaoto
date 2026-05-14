import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FunctionComponent, PropsWithChildren } from 'react';

import { SettingsModel } from '../models/settings/settings.model';
import { IRuntimeContext, RuntimeContext } from '../providers/runtime.provider';
import { CatalogSchemaLoader } from '../utils';

interface TestRuntimeProviderWrapperResult extends IRuntimeContext {
  Provider: FunctionComponent<PropsWithChildren>;
}

export const TestRuntimeProviderWrapper = (
  catalogSelect?: (catalogLibrary: CatalogLibrary) => CatalogLibraryEntry | undefined,
): TestRuntimeProviderWrapperResult => {
  const defaultSettings = new SettingsModel();
  const catalogLibraryCasted = catalogLibrary as CatalogLibrary;
  const basePath = CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH;
  const selectedCatalog = catalogSelect?.(catalogLibraryCasted) ?? catalogLibraryCasted.definitions[0];
  const setSelectedCatalog = jest.fn();
  const compatibleRuntimes: string[] = [];
  const camelCatalog = defaultSettings.camelCatalog;
  const testingCatalog = defaultSettings.testingCatalog;

  const Provider: FunctionComponent<PropsWithChildren> = (props) => (
    <RuntimeContext.Provider
      key={Date.now()}
      value={{
        basePath,
        catalogLibrary: catalogLibraryCasted,
        selectedCatalog,
        setSelectedCatalog,
        compatibleRuntimes,
        camelCatalog,
        testingCatalog,
      }}
    >
      {props.children}
    </RuntimeContext.Provider>
  );

  return {
    Provider,
    basePath,
    catalogLibrary: catalogLibraryCasted,
    selectedCatalog,
    setSelectedCatalog,
    compatibleRuntimes,
    camelCatalog,
    testingCatalog,
  };
};
