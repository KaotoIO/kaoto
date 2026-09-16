import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { fetchXsltXPathFunctions } from '../dynamic-catalog/support/fetch-xslt-xpath-functions';
import { useKaotoResourceContext } from '../hooks/useKaotoResourceContext/useKaotoResourceContext';
import { LoadingStatus } from '../models';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { XPathFunctionCatalogService } from '../services/xpath/catalog/xpath-function-catalog.service';
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
    let active = true;
    // Engage Loading synchronously, before the fetch. When currentSchemaType changes, doing this
    // inside the fetch's `.then` leaves a window where the library is reloading but loadingStatus
    // is still `Loaded`, so children (the whole toolbar) keep rendering as interactive while a
    // remount is already pending — an untrue "ready" signal that loses clicks and flakes E2E.
    setLoadingStatus(LoadingStatus.Loading);
    fetch(catalogUrl)
      .then((response) => response.json())
      .then((catalogLibrary: CatalogLibrary) => {
        if (!active) return;
        let catalogLibraryEntry: CatalogLibraryEntry | undefined = undefined;
        if (isDefined(catalogName)) {
          catalogLibraryEntry = catalogLibrary.definitions.find((c: CatalogLibraryEntry) => c.name === catalogName);
        }
        if (!isDefined(catalogLibraryEntry)) {
          catalogLibraryEntry = findCatalog(currentSchemaType, catalogLibrary);
        }

        setCatalogLibrary(catalogLibrary);
        setSelectedCatalog(catalogLibraryEntry);

        return fetchXsltXPathFunctions(basePath, catalogLibrary).catch(() => {
          /* XSLT catalog load failure is non-fatal — XPath editor falls back to hardcoded functions */
        });
      })
      .then(() => {
        if (active) setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });

    return () => {
      active = false;
      XPathFunctionCatalogService.clear();
    };
  }, [basePath, catalogName, catalogUrl, currentSchemaType]);

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
