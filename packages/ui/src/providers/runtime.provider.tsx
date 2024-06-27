import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useMemo, useState } from 'react';
import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { LoadingStatus, LocalStorageKeys } from '../models';
import { CatalogSchemaLoader, isDefined } from '../utils';
import { LocalStorageSettingsAdapter } from '../models/settings/localstorage-settings-adapter';

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
  const settingsAdapter = new LocalStorageSettingsAdapter();
  const settingsCatalogUrl = settingsAdapter.getSettings().catalogUrl;
  let catalogUrl;
  if (isDefined(settingsCatalogUrl) && settingsCatalogUrl !== '') {
    catalogUrl = settingsCatalogUrl;
  } else {
    catalogUrl = `${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}`;
  }
  const basePath = catalogUrl.substring(0, catalogUrl.lastIndexOf('/'));

  useEffect(() => {
    fetch(catalogUrl)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response.json();
      })
      .then((catalogLibrary: CatalogLibrary) => {
        let catalogLibraryEntry: CatalogLibraryEntry | undefined = undefined;
        if (isDefined(selectedCatalog)) {
          catalogLibraryEntry = catalogLibrary.definitions.find((c) => c.name === selectedCatalog.name);
        }
        if (!isDefined(catalogLibraryEntry)) {
          catalogLibraryEntry = catalogLibrary.definitions[0];
        }

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
  }, []);

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
          <Text data-testid="loading-library" component={TextVariants.h3}>
            Loading Library...
          </Text>
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
