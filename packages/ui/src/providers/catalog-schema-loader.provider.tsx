import catalogIndex from '@kaoto-next/camel-catalog/index.json?url';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { CatalogKind } from '../models';
import { CamelCatalogIndex, CatalogTypes, ComponentsCatalog } from '../models/camel-catalog-index';
import { useCatalogStore, useSchemasStore } from '../store';

export const CatalogSchemaLoaderContext = createContext<ComponentsCatalog>({});

/**
 * Loader for the components catalog and schemas.
 */
export const CatalogSchemaLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { setCatalog } = useCatalogStore((state) => state);
  const { setSchema } = useSchemasStore((state) => state);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(catalogIndex)
      .then((response) => response.json())
      .then((catalogIndex: CamelCatalogIndex) => {
        const camelComponentsFiles = catalogIndex.catalogs.components.files.map(fetchCatalogFile);
        const camelProcessorsFiles = catalogIndex.catalogs.models.files.map(fetchCatalogFile);
        const kameletsFiles = catalogIndex.kamelets[0].files.map(fetchCatalogFile);

        const schemaFiles = catalogIndex.schemas.map(async (schemaDef) => {
          const schemaFiles = schemaDef.files.map(fetchCatalogFile);
          const schema = await Promise.all(schemaFiles);

          return {
            name: schemaDef.name,
            version: schemaDef.version,
            schema: schema[0],
          };
        });

        Promise.all([
          Promise.all(camelComponentsFiles),
          Promise.all(camelProcessorsFiles),
          Promise.all(kameletsFiles),
          Promise.all(schemaFiles),
        ]).then(([camelComponents, camelProcessors, kamelets, schemas]) => {
          setCatalog(CatalogKind.Component, mergeCatalogs(camelComponents));
          setCatalog(CatalogKind.Processor, mergeCatalogs(camelProcessors));
          setCatalog(CatalogKind.Kamelet, mergeCatalogs(kamelets));

          schemas.forEach(setSchema);

          setIsLoading(false);
        });
      });
  }, []);

  return (
    <CatalogSchemaLoaderContext.Provider value={{}}>
      {isLoading ? <div>Loading...</div> : props.children}
    </CatalogSchemaLoaderContext.Provider>
  );
};

async function fetchCatalogFile(file: string) {
  const response = await fetch(`camel-catalog/${file}`);
  return await response.json();
}

function mergeCatalogs(catalogs: CatalogTypes[]): CatalogTypes {
  return catalogs.reduce((acc, catalog) => ({ ...acc, ...catalog }), {} as CatalogTypes);
}
