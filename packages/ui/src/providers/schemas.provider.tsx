import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { Loading } from '../components/Loading';
import { CamelCatalogIndex, Schema } from '../models';
import { sourceSchemaConfig } from '../models/camel';
import { useSchemasStore } from '../store';
import { CatalogSchemaLoader } from '../utils';

export const SchemasContext = createContext<Record<string, Schema>>({});

/**
 * Loader for the components schemas.
 */
export const SchemasLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const setSchema = useSchemasStore((state) => state.setSchema);
  const [isLoading, setIsLoading] = useState(true);
  const [schemas, setSchemas] = useState<Record<string, Schema>>({});

  useEffect(() => {
    fetch(`.${CatalogSchemaLoader.DEFAULT_CATALOG_PATH}/index.json`)
      .then((response) => response.json())
      .then(async (catalogIndex: CamelCatalogIndex) => {
        const schemaFilesPromise = CatalogSchemaLoader.getSchemasFiles(catalogIndex.schemas);

        const loadedSchemas = await Promise.all(schemaFilesPromise);
        const combinedSchemas = loadedSchemas.reduce(
          (acc, schema) => {
            setSchema(schema.name, schema);
            sourceSchemaConfig.setSchema(schema.name, schema);
            acc[schema.name] = schema;

            return acc;
          },
          {} as Record<string, Schema>,
        );

        setSchemas(combinedSchemas);
      })
      .then(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SchemasContext.Provider value={schemas}>
      {isLoading ? (
        <Loading>
          <Text component={TextVariants.h3}>Loading Schemas...</Text>
        </Loading>
      ) : (
        props.children
      )}
    </SchemasContext.Provider>
  );
};
