import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { CamelCatalogIndex, CatalogEntry, CatalogKind, ComponentsCatalog, Schema } from '../models';
import { sourceSchemaConfig } from '../models/camel-entities/source-schema-config';
import { useCatalogStore, useSchemasStore } from '../store';

const CatalogSchemaLoaderContext = createContext<ComponentsCatalog>({});
const DEFAULT_CATALOG_PATH = '/camel-catalog';
const VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

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

        Promise.all([camelComponentsFiles, camelProcessorsFiles, kameletsFiles]).then(
          ([camelComponents, camelProcessors, kamelets]) => {
            setCatalog(CatalogKind.Component, camelComponents.body);
            setCatalog(CatalogKind.Processor, camelProcessors.body);
            setCatalog(CatalogKind.Kamelet, kamelets.body);
          },
        );

        return catalogIndex;
      })
      .then(async (catalogIndex) => {
        const schemaFilesPromise = getSchemasFiles(catalogIndex.schemas);

        const schemas = await Promise.all(schemaFilesPromise);
        schemas.forEach((schema) => {
          setSchema(schema.name, schema);
          sourceSchemaConfig.setSchema(schema.name, schema);
        });
      })
      .then(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

function getSchemasFiles(schemaFiles: CatalogEntry[]): Promise<Schema>[] {
  return Object.entries(schemaFiles).map(async ([name, schemaDef]) => {
    const fetchedSchema = await fetchFile(schemaDef.file);
    const tags = [];

    if (VISUAL_FLOWS.includes(name)) {
      tags.push('visualization');
    }

    return {
      name,
      tags,
      version: schemaDef.version,
      uri: fetchedSchema.uri,
      schema: fetchedSchema.body,
    };
  });
}
