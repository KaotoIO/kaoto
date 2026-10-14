import { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { CamelCatalogIndex, FileTypes, FileTypesResponse, LoadingStatus } from '../models';
import { CitrusCatalogIndex } from '../models/citrus/citrus-catalog-index';
import { CitrusTestSchemaService } from '../models/visualization/flows/support/citrus-test-schema.service';
import { CatalogSchemaLoader } from '../utils';
import { DynamicCatalogRegistry } from './dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from './models';
import { fetchCamelCatalog } from './support/fetch-camel-catalog';
import { fetchCitrusCatalog } from './support/fetch-citrus-catalog';

export const CatalogContext = createContext<IDynamicCatalogRegistry>(DynamicCatalogRegistry.get());

/**
 * Loader for the components catalog.
 */
export const CatalogLoaderProvider: FunctionComponent<
  PropsWithChildren<{ getResourcesContentByType?: (filetype: FileTypes) => Promise<FileTypesResponse[]> }>
> = ({ getResourcesContentByType, children }) => {
  const [errorMessage, setErrorMessage] = useState('');
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';
  const request = useMemo(
    () => ({ basePath, selectedCatalogIndexFile, getResourcesContentByType }),
    [basePath, selectedCatalogIndexFile, getResourcesContentByType],
  );
  const [loadState, setLoadState] = useState({ request, status: LoadingStatus.Loading });
  // A new request hides interactive children immediately, before its effect starts fetching.
  const loadingStatus = loadState.request === request ? loadState.status : LoadingStatus.Loading;

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);

    // Capture a generation token so that a stale in-flight load cannot register its catalogs
    // or update React state after the cleanup for a newer selection has already run.
    let stale = false;

    fetch(indexFile)
      .then((response) => response.json())
      .then((catalogIndex: CatalogDefinition) => {
        if (stale) return;
        if (catalogIndex.runtime === 'Citrus') {
          return fetchCitrusCatalog({ catalogIndex: catalogIndex as CitrusCatalogIndex, relativeBasePath });
        } else {
          return fetchCamelCatalog({
            catalogIndex: catalogIndex as CamelCatalogIndex,
            relativeBasePath,
            getResourcesContentByType,
          });
        }
      })
      .then(() => {
        if (stale) return;
        setLoadState({ request, status: LoadingStatus.Loaded });
      })
      .catch((error) => {
        if (stale) return;
        setErrorMessage(error.message);
        setLoadState({ request, status: LoadingStatus.Error });
      });

    return () => {
      stale = true;
      DynamicCatalogRegistry.get().clearRegistry();
      CitrusTestSchemaService.clearKindMap();
    };
  }, [basePath, selectedCatalogIndexFile, getResourcesContentByType, request]);

  return (
    <>
      {loadingStatus === LoadingStatus.Loading && (
        <Loading>
          <Content data-testid="loading-catalogs" component={ContentVariants.h3}>
            Loading Catalogs...
          </Content>
        </Loading>
      )}

      {loadingStatus === LoadingStatus.Error && (
        <LoadDefaultCatalog errorMessage={errorMessage}>
          Some catalog files might not be available.
          <br />
          Please try to reload the page or load the default Catalog.
        </LoadDefaultCatalog>
      )}

      {loadingStatus === LoadingStatus.Loaded && children}
    </>
  );
};
