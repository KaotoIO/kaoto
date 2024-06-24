import { Text, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, createContext, useEffect, useState } from 'react';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import { CamelCatalogIndex, CatalogKind, ComponentsCatalog } from '../models';
import { CamelCatalogService } from '../models/visualization/flows';
import { CatalogSchemaLoader } from '../utils';

export const CatalogContext = createContext<typeof CamelCatalogService>(CamelCatalogService);

/**
 * Loader for the components catalog.
 */
export const CatalogLoaderProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);
    fetch(indexFile)
      .then((response) => {
        setIsLoading(true);
        return response;
      })
      .then((response) => response.json())
      .then(async (catalogIndex: CamelCatalogIndex) => {
        /** Camel Component list */
        const camelComponentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Component]>(
          `${relativeBasePath}/${catalogIndex.catalogs.components.file}`,
        );
        /** Full list of Camel Models, used as lookup for processors definitions definitions */
        const camelModelsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Processor]>(
          `${relativeBasePath}/${catalogIndex.catalogs.models.file}`,
        );
        /** Short list of patterns (EIPs) to fill the Catalog, as opposed of the CatalogKind.Processor which have all definitions */
        const camelPatternsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Pattern]>(
          `${relativeBasePath}/${catalogIndex.catalogs.patterns.file}`,
        );
        /** Short list of entities to fill the Catalog, as opposed of the CatalogKind.Processor which have all definitions */
        const camelEntitiesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Entity]>(
          `${relativeBasePath}/${catalogIndex.catalogs.entities.file}`,
        );
        /** Camel Languages list */
        const camelLanguagesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Language]>(
          `${relativeBasePath}/${catalogIndex.catalogs.languages.file}`,
        );
        /** Camel Dataformats list */
        const camelDataformatsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Dataformat]>(
          `${relativeBasePath}/${catalogIndex.catalogs.dataformats.file}`,
        );
        /** Camel Loadbalancers list */
        const camelLoadbalancersFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Loadbalancer]>(
          `${relativeBasePath}/${catalogIndex.catalogs.loadbalancers.file}`,
        );
        /** Camel Kamelets definitions list (CRDs) */
        const kameletsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
          `${relativeBasePath}/${catalogIndex.catalogs.kamelets.file}`,
        );
        /** Camel Kamelets boundaries definitions list (CRDs) */
        const kameletBoundariesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
          `${relativeBasePath}/${catalogIndex.catalogs.kameletBoundaries.file}`,
        );

        const [
          camelComponents,
          camelModels,
          camelPatterns,
          camelEntities,
          camelLanguages,
          camelDataformats,
          camelLoadbalancers,
          kamelets,
          kameletBoundaries,
        ] = await Promise.all([
          camelComponentsFiles,
          camelModelsFiles,
          camelPatternsFiles,
          camelEntitiesFiles,
          camelLanguagesFiles,
          camelDataformatsFiles,
          camelLoadbalancersFiles,
          kameletsFiles,
          kameletBoundariesFiles,
        ]);

        CamelCatalogService.setCatalogKey(CatalogKind.Component, camelComponents.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Processor, camelModels.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatterns.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Entity, camelEntities.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Language, camelLanguages.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, camelDataformats.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, camelLoadbalancers.body);
        CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, { ...kameletBoundaries.body, ...kamelets.body });
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
