import type { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { KaotoSchemaDefinition, LoadingStatus } from '../models';
import { sourceSchemaConfig } from '../models/camel';
import { useSchemasStore } from '../store';
import { CatalogSchemaLoader } from '../utils';

export const SchemasContext = createContext<Record<string, KaotoSchemaDefinition>>({});

/**
 * Loader for the components schemas.
 */
export const SchemasLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [errorMessage, setErrorMessage] = useState('');
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';
  const request = useMemo(() => ({ basePath, selectedCatalogIndexFile }), [basePath, selectedCatalogIndexFile]);
  const [loadState, setLoadState] = useState({ request, status: LoadingStatus.Loading });
  // A new request hides interactive children immediately, before its effect starts fetching.
  const loadingStatus = loadState.request === request ? loadState.status : LoadingStatus.Loading;

  const setSchema = useSchemasStore((state) => state.setSchema);
  const [schemas, setSchemas] = useState<Record<string, KaotoSchemaDefinition>>({});

  useEffect(() => {
    let stale = false;
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;

    fetch(indexFile)
      .then((response) => response.json())
      .then(async (catalogIndex: CatalogDefinition) => {
        const schemaFilesPromise = CatalogSchemaLoader.getSchemasFiles(indexFile, catalogIndex.schemas);

        const loadedSchemas = await Promise.all(schemaFilesPromise);
        if (stale) return;
        const combinedSchemas = loadedSchemas.reduce(
          (acc, schema) => {
            setSchema(schema.name, schema);
            sourceSchemaConfig.setSchema(schema.name, schema);
            acc[schema.name] = schema;

            return acc;
          },
          {} as Record<string, KaotoSchemaDefinition>,
        );

        setSchemas(combinedSchemas);
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
    };
  }, [basePath, selectedCatalogIndexFile, request, setSchema]);

  return (
    <SchemasContext.Provider value={schemas}>
      {loadingStatus === LoadingStatus.Loading && (
        <Loading>
          <Content data-testid="loading-schemas" component={ContentVariants.h3}>
            Loading Schemas...
          </Content>
        </Loading>
      )}

      {loadingStatus === LoadingStatus.Error && (
        <LoadDefaultCatalog errorMessage={errorMessage}>
          Some schema files might not be available.
          <br />
          Please try to reload the page or load the default Catalog.
        </LoadDefaultCatalog>
      )}

      {loadingStatus === LoadingStatus.Loaded && props.children}
    </SchemasContext.Provider>
  );
};
