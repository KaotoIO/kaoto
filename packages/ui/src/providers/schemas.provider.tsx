import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { CamelCatalogIndex, KaotoSchemaDefinition } from '../models';
import { sourceSchemaConfig } from '../models/camel';
import { useSchemasStore } from '../store';
import { CatalogSchemaLoader } from '../utils';

export const SchemasContext = createContext<Record<string, KaotoSchemaDefinition>>({});

/**
 * Loader for the components schemas.
 */
export const SchemasLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';
  const setSchema = useSchemasStore((state) => state.setSchema);
  const [schemas, setSchemas] = useState<Record<string, KaotoSchemaDefinition>>({});

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    fetch(indexFile)
      .then((response) => {
        setIsLoading(true);
        return response;
      })
      .then((response) => response.json())
      .then(async (catalogIndex: CamelCatalogIndex) => {
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
        setIsLoading(false);
      })
      .catch((error) => {
        /** TODO: Provide a friendly error message */
        console.error(error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogIndexFile]);

  return (
    <SchemasContext.Provider value={schemas}>
      {isLoading ? (
        <Loading>
          <Text data-testid="loading-schemas" component={TextVariants.h3}>
            Loading Schemas...
          </Text>
        </Loading>
      ) : (
        props.children
      )}
    </SchemasContext.Provider>
  );
};
