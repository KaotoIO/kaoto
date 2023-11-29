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
        /** Camel Component list */
        const camelComponentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Component]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.components.file}`,
        );
        /** Full list of Camel Models, used as lookup for processors definitions definitions */
        const camelModelsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Processor]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.models.file}`,
        );
        /** Short list of patterns (EIPs) to fill the Catalog, as opposed of the CatalogKind.Processor which have all definitions */
        const camelPatternsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Pattern]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.patterns.file}`,
        );
        /** Camel Languages list */
        const camelLanguagesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Language]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.languages.file}`,
        );
        /** Camel Dataformats list */
        const camelDataformatsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Dataformat]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.dataformats.file}`,
        );
        /** Camel Kamelets definitions list (CRDs) */
        const kameletsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.kamelets.file}`,
        );
        /** Camel Kamelets boundaries definitions list (CRDs) */
        const kameletBoundariesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.KameletBoundary]>(
          `${props.catalogUrl}/${catalogIndex.catalogs.kameletBoundaries.file}`,
        );

        const [
          camelComponents,
          camelModels,
          camelPatterns,
          camelLanguages,
          camelDataformats,
          kamelets,
          kameletBoundaries,
        ] = await Promise.all([
          camelComponentsFiles,
          camelModelsFiles,
          camelPatternsFiles,
          camelLanguagesFiles,
          camelDataformatsFiles,
          kameletsFiles,
          kameletBoundariesFiles,
        ]);

        CamelCatalogService.setCatalogKey(CatalogKind.Component, camelComponents.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Processor, camelModels.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatterns.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Language, camelLanguages.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, camelDataformats.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kamelets.body);
        CamelCatalogService.setCatalogKey(CatalogKind.KameletBoundary, kameletBoundaries.body);
      })
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        /** TODO: Provide a friendly error message */
        console.error(error);
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
