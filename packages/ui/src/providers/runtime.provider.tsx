import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useMemo, useState } from 'react';
import { Loading } from '../components/Loading';
import { LocalStorageKeys } from '../models';
import { isDefined } from '../utils';

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
  const [isLoading, setIsLoading] = useState(true);
  const [catalogLibrary, setCatalogLibrary] = useState<CatalogLibrary | undefined>(undefined);
  let localSelectedCatalog: CatalogLibraryEntry | undefined = undefined;

  try {
    localSelectedCatalog = JSON.parse(localStorage.getItem(LocalStorageKeys.SelectedCatalog) ?? 'undefined');
  } catch (error) {
    localSelectedCatalog = undefined;
  }

  const [selectedCatalog, setSelectedCatalog] = useState<CatalogLibraryEntry | undefined>(localSelectedCatalog);

  useEffect(() => {
    fetch(`${props.catalogUrl}/index.json`)
      .then((response) => response.json())
      .then((catalogLibrary: CatalogLibrary) => {
        setCatalogLibrary(catalogLibrary);

        const isCatalogFound =
          isDefined(selectedCatalog) && catalogLibrary.definitions.some((c) => c.name === selectedCatalog?.name);

        if (!isCatalogFound) {
          setSelectedCatalog(catalogLibrary.definitions[0]);
        }
      })
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        /** TODO: Provide a friendly error message */
        console.error(error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runtimeContext: IRuntimeContext = useMemo(
    () => ({
      basePath: props.catalogUrl,
      catalogLibrary,
      selectedCatalog,
      setSelectedCatalog,
    }),
    [catalogLibrary, props.catalogUrl, selectedCatalog],
  );

  return (
    <RuntimeContext.Provider value={runtimeContext}>
      {isLoading ? (
        <Loading>
          <Text data-testid="loading-library" component={TextVariants.h3}>
            Loading Library...
          </Text>
        </Loading>
      ) : (
        props.children
      )}
    </RuntimeContext.Provider>
  );
};
