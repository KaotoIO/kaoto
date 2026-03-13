import { CatalogDefinition } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { useRuntimeContext } from '../hooks/useRuntimeContext/useRuntimeContext';
import {
  CamelCatalogIndex,
  CamelCatalogService,
  CatalogKind,
  ComponentsCatalog,
  FileTypes,
  FileTypesResponse,
  LoadingStatus,
} from '../models';
import { CitrusCatalogIndex } from '../models/citrus-catalog-index';
import { CatalogSchemaLoader } from '../utils';
import { DynamicCatalog } from './dynamic-catalog';
import { DynamicCatalogRegistry } from './dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from './models';
import {
  CamelComponentsProvider,
  CamelDataformatProvider,
  CamelFunctionProvider,
  CamelLanguageProvider,
  CamelLoadbalancerProvider,
  CamelProcessorsProvider,
} from './providers/camel-components.provider';
import { CamelKameletsProvider } from './providers/camel-kamelets.provider';
import {
  CitrusTestActionsProvider,
  CitrusTestContainersProvider,
  CitrusTestEndpointsProvider,
  CitrusTestFunctionsProvider,
  CitrusTestValidationMatcherProvider,
} from './providers/citrus-components.provider';

export const CatalogContext = createContext<IDynamicCatalogRegistry>(DynamicCatalogRegistry.get());

/**
 * Loader for the components catalog.
 */
export const CatalogLoaderProvider: FunctionComponent<
  PropsWithChildren<{ getResourcesContentByType?: (filetype: FileTypes) => Promise<FileTypesResponse[]> }>
> = ({ getResourcesContentByType, children }) => {
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const runtimeContext = useRuntimeContext();
  const { basePath, selectedCatalog } = runtimeContext;
  const selectedCatalogIndexFile = selectedCatalog?.fileName ?? '';

  useEffect(() => {
    const indexFile = `${basePath}/${selectedCatalogIndexFile}`;
    const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);
    fetch(indexFile)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response;
      })
      .then((response) => response.json())
      .then(async (catalogIndex: CatalogDefinition) => {
        if (catalogIndex.runtime === 'Citrus') {
          return fetchCitrusCatalog(catalogIndex as CitrusCatalogIndex, relativeBasePath);
        } else {
          return fetchCamelCatalog(catalogIndex as CamelCatalogIndex, relativeBasePath);
        }
      })
      .then(() => {
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCatalogIndexFile, getResourcesContentByType]);

  async function fetchCamelCatalog(catalogIndex: CamelCatalogIndex, relativeBasePath: string) {
    /** Camel Component list */
    const camelComponentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Component]>(
      `${relativeBasePath}/${catalogIndex.catalogs.components.file}`,
    );
    /** Full list of Camel Models, used as lookup for processors definitions */
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
    /** Functions catalog */
    const functionsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Function]>(
      `${relativeBasePath}/${catalogIndex.catalogs.functions.file}`,
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
      functions,
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
      functionsFiles,
    ]);

    /**
     * Temporary while we switch all sync API to ASYNC from the DynamicCatalogRegistry.
     * This will be removed once all consumers are refactored to use DynamicCatalogRegistry
     */
    CamelCatalogService.setCatalogKey(CatalogKind.Component, camelComponents.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, camelModels.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, camelPatterns.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, camelEntities.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, camelLanguages.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, camelDataformats.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, camelLoadbalancers.body);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, { ...kameletBoundaries.body, ...kamelets.body });
    CamelCatalogService.setCatalogKey(CatalogKind.Function, functions.body);

    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Component,
      new DynamicCatalog(new CamelComponentsProvider(camelComponents.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Processor,
      new DynamicCatalog(new CamelProcessorsProvider(camelModels.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Pattern,
      new DynamicCatalog(new CamelProcessorsProvider(camelPatterns.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Entity,
      new DynamicCatalog(new CamelProcessorsProvider(camelEntities.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Language,
      new DynamicCatalog(new CamelLanguageProvider(camelLanguages.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Dataformat,
      new DynamicCatalog(new CamelDataformatProvider(camelDataformats.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Loadbalancer,
      new DynamicCatalog(new CamelLoadbalancerProvider(camelLoadbalancers.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Kamelet,
      new DynamicCatalog(
        new CamelKameletsProvider({ ...kameletBoundaries.body, ...kamelets.body }, getResourcesContentByType),
      ),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.Function,
      new DynamicCatalog(new CamelFunctionProvider(functions.body)),
    );
  }

  async function fetchCitrusCatalog(catalogIndex: CitrusCatalogIndex, relativeBasePath: string) {
    /** Citrus test actions */
    const actionsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestAction]>(
      `${relativeBasePath}/${catalogIndex.catalogs.actions.file}`,
    );
    /** Citrus test containers */
    const containerFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestContainer]>(
      `${relativeBasePath}/${catalogIndex.catalogs.containers.file}`,
    );
    /** Citrus test endpoints */
    const endpointFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestEndpoint]>(
      `${relativeBasePath}/${catalogIndex.catalogs.endpoints.file}`,
    );
    /** Citrus test functions */
    const functionFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestFunction]>(
      `${relativeBasePath}/${catalogIndex.catalogs.functions.file}`,
    );
    /** Citrus test validation matcher */
    const validationMatcherFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestValidationMatcher]>(
      `${relativeBasePath}/${catalogIndex.catalogs.validationMatcher.file}`,
    );

    const [testActions, testContainers, testEndpoints, testFunctions, testValidationMatcher] = await Promise.all([
      actionsFiles,
      containerFiles,
      endpointFiles,
      functionFiles,
      validationMatcherFiles,
    ]);

    CamelCatalogService.setCatalogKey(CatalogKind.TestAction, testActions.body);
    CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, testContainers.body);
    CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, testEndpoints.body);
    CamelCatalogService.setCatalogKey(CatalogKind.TestFunction, testFunctions.body);
    CamelCatalogService.setCatalogKey(CatalogKind.TestValidationMatcher, testValidationMatcher.body);

    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.TestAction,
      new DynamicCatalog(new CitrusTestActionsProvider(testActions.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.TestContainer,
      new DynamicCatalog(new CitrusTestContainersProvider(testContainers.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.TestEndpoint,
      new DynamicCatalog(new CitrusTestEndpointsProvider(testEndpoints.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.TestFunction,
      new DynamicCatalog(new CitrusTestFunctionsProvider(testFunctions.body)),
    );
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.TestValidationMatcher,
      new DynamicCatalog(new CitrusTestValidationMatcherProvider(testValidationMatcher.body)),
    );
  }

  return (
    <>
      {loadingStatus === LoadingStatus.Loading && (
        <Loading>
          <Content data-testid="loading-catalogs" component={ContentVariants.h3}>
            Loading Catalogs...
          </Content>
        </Loading>
      )}

      {loadingStatus === LoadingStatus.Error && (
        <LoadDefaultCatalog errorMessage={errorMessage}>
          Some catalog files might not be available.
          <br />
          Please try to reload the page or load the default Catalog.
        </LoadDefaultCatalog>
      )}

      {loadingStatus === LoadingStatus.Loaded && children}
    </>
  );
};
