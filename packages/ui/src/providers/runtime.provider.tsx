import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { Content, ContentVariants } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { LoadingStatus } from '../models';
import { SourceSchemaType } from '../models/camel';
import { CatalogVersion } from '../models/settings/settings.model';
import { EntitiesContext } from './entities.provider';

export interface IRuntimeContext {
  basePath: string;
  catalogLibrary: CatalogLibrary | undefined;
  selectedCatalog: CatalogLibraryEntry | undefined;
  setSelectedCatalog: (catalog: CatalogLibraryEntry | undefined) => void;
  compatibleRuntimes: string[];
}

export const RuntimeContext = createContext<IRuntimeContext | undefined>(undefined);

/**
 * Loader for the available Catalog library.
 */
export const RuntimeProvider: FunctionComponent<
  PropsWithChildren<{
    catalogUrl: string;
    camelCatalog: CatalogVersion;
    citrusCatalog: CatalogVersion;
  }>
> = (props) => {
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [catalogLibrary, setCatalogLibrary] = useState<CatalogLibrary | undefined>(undefined);
  const entitiesContext = useContext(EntitiesContext);
  const currentSchemaType = entitiesContext?.currentSchemaType || SourceSchemaType.Route;
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogLibraryEntry | undefined>(undefined);
  const basePath = props.catalogUrl.substring(0, props.catalogUrl.lastIndexOf('/'));

  const compatibleRuntimes = useMemo(
    () => entitiesContext?.camelResource.getCompatibleRuntimes() ?? [],
    [entitiesContext?.camelResource],
  );

  // Effect 1: Fetch catalog library (only when catalogUrl changes)
  useEffect(() => {
    setLoadingStatus(LoadingStatus.Loading);
    fetch(props.catalogUrl)
      .then((response) => response.json())
      .then((catalogLibrary: CatalogLibrary) => {
        setCatalogLibrary(catalogLibrary);
        setLoadingStatus(LoadingStatus.Loaded);
      })
      .catch((error) => {
        setErrorMessage(error.message);
        setLoadingStatus(LoadingStatus.Error);
      });
  }, [props.catalogUrl]);

  // Effect 2: Select catalog from library (when library, settings, or file type changes)
  useEffect(() => {
    if (!catalogLibrary) return;

    const isTest = currentSchemaType === SourceSchemaType.Test;
    const settingsCatalog = isTest ? props.citrusCatalog : props.camelCatalog;

    const catalogLibraryEntry =
      settingsCatalog.version === ''
        ? catalogLibrary.definitions.find((c) => c.runtime === settingsCatalog.runtime)
        : catalogLibrary.definitions.find(
            (c) => c.version === settingsCatalog.version && c.runtime === settingsCatalog.runtime,
          );

    setSelectedCatalog(catalogLibraryEntry);
  }, [catalogLibrary, currentSchemaType, props.camelCatalog, props.citrusCatalog, compatibleRuntimes]);

  const runtimeContext: IRuntimeContext = useMemo(
    () => ({
      basePath,
      catalogLibrary,
      selectedCatalog,
      setSelectedCatalog,
      compatibleRuntimes,
    }),
    [basePath, catalogLibrary, selectedCatalog, compatibleRuntimes],
  );

  return (
    <RuntimeContext.Provider value={runtimeContext}>
      {loadingStatus === LoadingStatus.Loading && (
        <Loading>
          <Content data-testid="loading-library" component={ContentVariants.h3}>
            Loading Library...
          </Content>
        </Loading>
      )}

      {loadingStatus === LoadingStatus.Error && (
        <LoadDefaultCatalog errorMessage={errorMessage}>
          Some catalog library files might not be available.
          <br />
          Please try to reload the page or load the default Catalog.
        </LoadDefaultCatalog>
      )}

      {loadingStatus === LoadingStatus.Loaded && props.children}
    </RuntimeContext.Provider>
  );
};
