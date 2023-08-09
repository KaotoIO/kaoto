import catalogIndex from '@kaoto-next/camel-catalog/index.json?url';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { CatalogKind } from '../models';
import { CamelCatalogIndex, CatalogTypes, ComponentsCatalog } from '../models/camel-catalog-index';
import { useComponentsCatalogStore } from '../store';

export const ComponentsCatalogContext = createContext<ComponentsCatalog>({});

/**
 * Loader for the components catalog.
 */
export const ComponentsCatalogProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { catalogs, setCatalog } = useComponentsCatalogStore((state) => state);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(catalogIndex)
      .then((response) => response.json())
      .then((catalogIndex: CamelCatalogIndex) => {
        const camelComponentsFiles = catalogIndex.catalogs.components.files.map(fetchCatalogFile);
        const camelProcessorsFiles = catalogIndex.catalogs.models.files.map(fetchCatalogFile);
        const kameletsFiles = catalogIndex.kamelets[0].files.map(fetchCatalogFile);

        Promise.all([
          Promise.all(camelComponentsFiles),
          Promise.all(camelProcessorsFiles),
          Promise.all(kameletsFiles),
        ]).then(([camelComponents, camelProcessors, kamelets]) => {
          setCatalog(CatalogKind.Component, mergeCatalogs(camelComponents));
          setCatalog(CatalogKind.Processor, mergeCatalogs(camelProcessors));
          setCatalog(CatalogKind.Kamelet, mergeCatalogs(kamelets));
          setIsLoading(false);
        });
      });
  }, []);

  return (
    <ComponentsCatalogContext.Provider value={catalogs}>
      {isLoading ? <div>Loading...</div> : props.children}
    </ComponentsCatalogContext.Provider>
  );
};

async function fetchCatalogFile(file: string) {
  const response = await fetch(`camel-catalog/${file}`);
  return await response.json();
}

function mergeCatalogs(catalogs: CatalogTypes[]): CatalogTypes {
  return catalogs.reduce((acc, catalog) => ({ ...acc, ...catalog }), {} as CatalogTypes);
}
