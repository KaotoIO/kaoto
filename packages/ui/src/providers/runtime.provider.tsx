import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { LoadingStatus, LocalStorageKeys } from '../models';
import { SourceSchemaType } from '../models/camel';
import { CatalogSchemaLoader } from '../utils';
import { findCatalog } from '../utils/catalog-helper';

export interface IRuntimeContext {
  basePath: string;
  catalogLibrary: CatalogLibrary | undefined;
  selectedCatalog: CatalogLibraryEntry | undefined;
  setSelectedCatalog: (catalog: CatalogLibraryEntry) => void;
}

export const RuntimeContext = createContext<IRuntimeContext | undefined>(undefined);

/**
 * Loader for the available Catalog library.
 */
export const RuntimeProvider: FunctionComponent<PropsWithChildren<{ catalogUrl: string }>> = (props) => {
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [catalogLibrary, setCatalogLibrary] = useState<CatalogLibrary | undefined>(undefined);
  let localSelectedCatalog: CatalogLibraryEntry | undefined = undefined;

  try {
    localSelectedCatalog = JSON.parse(localStorage.getItem(LocalStorageKeys.SelectedCatalog) ?? 'undefined');
  } catch (error) {
    localSelectedCatalog = undefined;
  }

  const [selectedCatalog, setSelectedCatalog] = useState<CatalogLibraryEntry | undefined>(localSelectedCatalog);
  const basePath = props.catalogUrl;

  useEffect(() => {
    fetch(`${basePath}/${CatalogSchemaLoader.DEFAULT_CAMEL_CATALOG_INDEX_PATH}`)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response.json();
      })
      .then((catalogLibrary: CatalogLibrary) => {
        let catalogLibraryEntry: CatalogLibraryEntry | undefined = undefined;
        if (isDefined(selectedCatalog)) {
          catalogLibraryEntry = catalogLibrary.definitions.find(
            (c: CatalogLibraryEntry) => c.name === selectedCatalog.name,
          );
        }
        if (!isDefined(catalogLibraryEntry)) {
          catalogLibraryEntry = findCatalog(SourceSchemaType.Route, catalogLibrary);
        }

        addCitrusCatalog(basePath, catalogLibrary);

        setCatalogLibrary(catalogLibrary);
        setSelectedCatalog(catalogLibraryEntry);
      })
      .then(() => {
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  function addCitrusCatalog(basePath: string, catalogLibrary: CatalogLibrary) {
    const indexFile = `${basePath}/${CatalogSchemaLoader.DEFAULT_CITRUS_CATALOG_INDEX_PATH}`;
    fetch(indexFile)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response.json();
      })
      .then((citrusCatalogLibrary: CatalogLibrary) => {
        catalogLibrary.definitions.push(...citrusCatalogLibrary.definitions);
      })
      .then(() => {
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
  }

  const runtimeContext: IRuntimeContext = useMemo(
    () => ({
      basePath,
      catalogLibrary,
      selectedCatalog,
      setSelectedCatalog,
    }),
    [basePath, catalogLibrary, selectedCatalog],
  );

  return (
    <RuntimeContext.Provider value={runtimeContext}>
      {loadingStatus === LoadingStatus.Loading && (
        <Loading>
          <Content data-testid="loading-library" component={ContentVariants.h3}>
            Loading Library...
          </Content>
        </Loading>
      )}

      {loadingStatus === LoadingStatus.Error && (
        <LoadDefaultCatalog errorMessage={errorMessage}>
          Some catalog library files might not be available.
          <br />
          Please try to reload the page or load the default Catalog.
        </LoadDefaultCatalog>
      )}

      {loadingStatus === LoadingStatus.Loaded && props.children}
    </RuntimeContext.Provider>
  );
};
