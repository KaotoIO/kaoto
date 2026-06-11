import { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { CamelCatalogIndex, CamelCatalogService, FileTypes, FileTypesResponse, LoadingStatus } from '../models';
import { CitrusCatalogIndex } from '../models/citrus/citrus-catalog-index';
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
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);
    fetch(indexFile)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response;
      })
      .then((response) => response.json())
      .then(async (catalogIndex: CatalogDefinition) => {
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
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });

    return () => {
      CamelCatalogService.clearCatalogs();
      DynamicCatalogRegistry.get().clearRegistry();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogIndexFile, getResourcesContentByType]);

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
