import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { Loading } from '../components/Loading';
import { CamelCatalogIndex, CatalogKind, ComponentsCatalog } from '../models';
import { CamelCatalogService } from '../models/visualization/flows';
import { CatalogSchemaLoader } from '../utils';

export const CatalogContext = createContext<typeof CamelCatalogService>(CamelCatalogService);

/**
 * Loader for the components catalog.
 */
export const CatalogLoaderProvider: FunctionComponent<PropsWithChildren<{ catalogUrl: string }>> = (props) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${props.catalogUrl}/index.json`)
      .then((response) => response.json())
      .then(async (catalogIndex: CamelCatalogIndex) => {
        const camelComponentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Component]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.components.file}`,
        );
        const camelProcessorsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Processor]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.patterns.file}`,
        );
        const camelLanguagesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Language]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.languages.file}`,
        );
        const camelDataformatsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Dataformat]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.dataformats.file}`,
        );
        const kameletsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.kamelets.file}`,
        );

        const [camelComponents, camelProcessors, camelLanguages, camelDataformats, kamelets] = await Promise.all([
          camelComponentsFiles,
          camelProcessorsFiles,
          camelLanguagesFiles,
          camelDataformatsFiles,
          kameletsFiles,
        ]);

        CamelCatalogService.setCatalogKey(CatalogKind.Component, camelComponents.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Processor, camelProcessors.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Language, camelLanguages.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, camelDataformats.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kamelets.body);
      })
      .then(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CatalogContext.Provider value={CamelCatalogService}>
      {isLoading ? (
        <Loading>
          <Text data-testid="loading-catalogs" component={TextVariants.h3}>
            Loading Catalogs...
          </Text>
        </Loading>
      ) : (
        props.children
      )}
    </CatalogContext.Provider>
  );
};
