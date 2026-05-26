import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { useKaotoResourceContext } from '../hooks/useKaotoResourceContext/useKaotoResourceContext';
import { LoadingStatus } from '../models';
import { SourceSchemaType } from '../models/camel';
import { findCatalog } from '../utils/catalog-helper';

export interface IRuntimeContext {
  basePath: string;
  catalogLibrary: CatalogLibrary | undefined;
  selectedCatalog: CatalogLibraryEntry | undefined;
  setSelectedCatalog: (catalog: CatalogLibraryEntry | undefined) => void;
}

export const RuntimeContext = createContext<IRuntimeContext | undefined>(undefined);

interface IRuntimeProvider {
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
}

/**
 * Loader for the available Catalog library.
 */
export const RuntimeProvider: FunctionComponent<PropsWithChildren<IRuntimeProvider>> = ({
  catalogUrl,
  runtimeCatalogName,
  testingCatalogName,
  children,
}) => {
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [catalogLibrary, setCatalogLibrary] = useState<CatalogLibrary | undefined>(undefined);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogLibraryEntry | undefined>();

  const { kaotoResource } = useKaotoResourceContext();
  const currentSchemaType = kaotoResource.getType();
  const catalogName = currentSchemaType === SourceSchemaType.Test ? testingCatalogName : runtimeCatalogName;

  const basePath = catalogUrl.substring(0, catalogUrl.lastIndexOf('/'));

  useEffect(() => {
    fetch(catalogUrl)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response.json();
      })
      .then((catalogLibrary: CatalogLibrary) => {
        let catalogLibraryEntry: CatalogLibraryEntry | undefined = undefined;
        if (isDefined(catalogName)) {
          catalogLibraryEntry = catalogLibrary.definitions.find((c: CatalogLibraryEntry) => c.name === catalogName);
        }
        if (!isDefined(catalogLibraryEntry)) {
          catalogLibraryEntry = findCatalog(currentSchemaType, catalogLibrary);
        }

        setCatalogLibrary(catalogLibrary);
        if (isDefined(catalogLibraryEntry)) {
          setSelectedCatalog(catalogLibraryEntry);
        }
      })
      .then(() => {
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSchemaType]);

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

      {loadingStatus === LoadingStatus.Loaded && children}
    </RuntimeContext.Provider>
  );
};
