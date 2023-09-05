import catalogIndex from '@kaoto-next/camel-catalog/index.json?url';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { CamelSchemasProcessor, DEFAULT_CATALOG_PATH } from '../camel-utils';
import { CamelCatalogIndex, CatalogEntry, CatalogKind, ComponentsCatalog, Schema } from '../models';
import { useCatalogStore, useSchemasStore } from '../store';

const CatalogSchemaLoaderContext = createContext<ComponentsCatalog>({});

/**
 * Loader for the components catalog and schemas.
 */
export const CatalogSchemaLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const setCatalog = useCatalogStore((state) => state.setCatalog);
  const setSchema = useSchemasStore((state) => state.setSchema);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(catalogIndex)
      .then((response) => response.json())
      .then((catalogIndex: CamelCatalogIndex) => {
        const camelComponentsFiles = fetchCatalogFile(catalogIndex.catalogs.components.file);
        const camelProcessorsFiles = fetchCatalogFile(catalogIndex.catalogs.models.file);
        const kameletsFiles = fetchCatalogFile(catalogIndex.catalogs.kamelets.file);

        const schemaFiles = getSchemasFiles(catalogIndex.schemas);

        Promise.all([camelComponentsFiles, camelProcessorsFiles, kameletsFiles, Promise.all(schemaFiles)]).then(
          ([camelComponents, camelProcessors, kamelets, schemas]) => {
            setCatalog(CatalogKind.Component, camelComponents);
            setCatalog(CatalogKind.Processor, camelProcessors);
            setCatalog(CatalogKind.Kamelet, kamelets);

            CamelSchemasProcessor.getSchemas(schemas).forEach(setSchema);

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

async function fetchCatalogFile(file: string) {
  const response = await fetch(`${DEFAULT_CATALOG_PATH}/${file}`);
  return await response.json();
}

function getSchemasFiles(schemaFiles: CatalogEntry[]): Promise<Schema>[] {
  return schemaFiles.map(async (schemaDef) => {
    const schema = await fetchCatalogFile(schemaDef.file);

    return {
      name: schemaDef.name,
      tags: [],
      version: schemaDef.version,
      uri: `${DEFAULT_CATALOG_PATH}/${schemaDef.file}`,
      schema: schema,
    };
  });
}
