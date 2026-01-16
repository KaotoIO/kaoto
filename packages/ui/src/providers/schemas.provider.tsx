import type { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

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
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';
  const setSchema = useSchemasStore((state) => state.setSchema);
  const [schemas, setSchemas] = useState<Record<string, KaotoSchemaDefinition>>({});

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    fetch(indexFile)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response;
      })
      .then((response) => response.json())
      .then(async (catalogIndex: CatalogDefinition) => {
        const schemaFilesPromise = CatalogSchemaLoader.getSchemasFiles(indexFile, catalogIndex.schemas);

        const loadedSchemas = await Promise.all(schemaFilesPromise);
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
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogIndexFile]);

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
