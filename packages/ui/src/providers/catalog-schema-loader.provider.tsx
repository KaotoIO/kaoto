import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { CamelSchemasProcessor, DEFAULT_CATALOG_PATH } from '../camel-utils';
import { CamelCatalogIndex, CatalogEntry, CatalogKind, ComponentsCatalog, Schema } from '../models';
import { useCatalogStore, useSchemasStore } from '../store';
import { sourceSchemaConfig } from '../models/camel-entities/source-schema-config';

const CatalogSchemaLoaderContext = createContext<ComponentsCatalog>({});

/**
 * Loader for the components catalog and schemas.
 */
export const CatalogSchemaLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const setCatalog = useCatalogStore((state) => state.setCatalog);
  const setSchema = useSchemasStore((state) => state.setSchema);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`.${DEFAULT_CATALOG_PATH}/index.json`)
      .then((response) => response.json())
      .then((catalogIndex: CamelCatalogIndex) => {
        const camelComponentsFiles = fetchFile(catalogIndex.catalogs.components.file);
        const camelProcessorsFiles = fetchFile(catalogIndex.catalogs.models.file);
        const kameletsFiles = fetchFile(catalogIndex.catalogs.kamelets.file);

        const schemaFiles = getSchemasFiles(catalogIndex.schemas);

        Promise.all([camelComponentsFiles, camelProcessorsFiles, kameletsFiles, schemaFiles]).then(
          ([camelComponents, camelProcessors, kamelets, schemas]) => {
            setCatalog(CatalogKind.Component, camelComponents.body);
            setCatalog(CatalogKind.Processor, camelProcessors.body);
            setCatalog(CatalogKind.Kamelet, kamelets.body);

            Object.entries(CamelSchemasProcessor.getSchemas(schemas)).forEach(([key, schema]) => {
              setSchema(key, schema);
              sourceSchemaConfig.setSchema(key, schema);
            });
            setIsLoading(false);
          },
        );
      });
  }, []);

  return (
    <CatalogSchemaLoaderContext.Provider value={{}}>
      {isLoading ? <div>Loading...</div> : props.children}
    </CatalogSchemaLoaderContext.Provider>
  );
};

async function fetchFile(file: string) {
  /** The `.` is required to support relative routes in GitHub pages */
  const response = await fetch(`.${DEFAULT_CATALOG_PATH}/${file}`);
  const body = await response.json();

  return { body, uri: response.url };
}

function getSchemasFiles(schemaFiles: CatalogEntry[]): Promise<{ [key: string]: Schema }> {
  const answer: any = {};
  Object.entries(schemaFiles).forEach(async ([schemaName, schemaDef]) => {
    const fetchedSchema = await fetchFile(schemaDef.file);
    answer[schemaName] = {
      name: schemaDef.name,
      tags: [],
      version: schemaDef.version,
      uri: fetchedSchema.uri,
      schema: fetchedSchema.body,
    };
  });
  return Promise.resolve(answer);
}
