import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { Content, ContentVariants } from '@patternfly/react-core';
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { LoadDefaultCatalog } from '../components/LoadDefaultCatalog';
import { Loading } from '../components/Loading';
import { LoadingStatus } from '../models';
import { COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE } from '../models/camel/compatible-runtimes';
import { detectSchemaType } from '../models/camel/detect-schema-type';
import { useSourceCodeStore } from '../store';
import { findCatalog, isCatalogCompatible } from '../utils/catalog-helper';
import { getPersistedCatalog, setPersistedCatalog } from '../utils/catalog-storage';
import { SourceCodeContext } from './source-code.provider';

export interface IRuntimeContext {
  basePath: string;
  catalogLibrary: CatalogLibrary | undefined;
  selectedCatalog: CatalogLibraryEntry | undefined;
  setSelectedCatalog: (catalog: CatalogLibraryEntry | undefined) => void;
}

export const RuntimeContext = createContext<IRuntimeContext | undefined>(undefined);

/**
 * Loader for the available Catalog library.
 *
 * The compatible-runtimes signal is derived from the current source code and
 * path via `detectSchemaType` + the static compatible-runtimes registry. This
 * keeps `RuntimeProvider` independent of `EntitiesContext`, allowing the
 * existing provider hierarchy (EntitiesProvider nested inside the catalog
 * loaders) to remain in place so visual entities are always computed against
 * a populated `CamelCatalogService`.
 */
export const RuntimeProvider: FunctionComponent<PropsWithChildren<{ catalogUrl: string }>> = (props) => {
  const [loadingStatus, setLoadingStatus] = useState(LoadingStatus.Loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [catalogLibrary, setCatalogLibrary] = useState<CatalogLibrary | undefined>(undefined);

  const sourceCode = useContext(SourceCodeContext);
  const path = useSourceCodeStore((state) => state.path);

  const schemaType = useMemo(() => detectSchemaType(sourceCode, path), [sourceCode, path]);
  const compatibleRuntimes = COMPATIBLE_RUNTIMES_BY_SCHEMA_TYPE[schemaType];
  const compatibleRuntimesKey = [...compatibleRuntimes].sort().join('|');

  const [selectedCatalog, setSelectedCatalogState] = useState<CatalogLibraryEntry | undefined>(undefined);
  const basePath = props.catalogUrl.substring(0, props.catalogUrl.lastIndexOf('/'));

  const setSelectedCatalog = useCallback(
    (catalog: CatalogLibraryEntry | undefined) => {
      setSelectedCatalogState(catalog);
      if (isDefined(catalog)) {
        setPersistedCatalog(schemaType, catalog);
      }
    },
    [schemaType],
  );

  useEffect(() => {
    fetch(props.catalogUrl)
      .then((response) => {
        setLoadingStatus(LoadingStatus.Loading);
        return response.json();
      })
      .then((library: CatalogLibrary) => {
        const persisted = getPersistedCatalog(schemaType);

        let resolved: CatalogLibraryEntry | undefined;
        if (
          isDefined(persisted) &&
          isCatalogCompatible(persisted, compatibleRuntimes) &&
          library.definitions.some((c) => c.name === persisted.name)
        ) {
          resolved = persisted;
        } else {
          resolved = findCatalog(compatibleRuntimes, library);
        }

        setCatalogLibrary(library);
        if (isDefined(resolved)) {
          setSelectedCatalogState(resolved);
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
  }, [schemaType, compatibleRuntimesKey]);

  const runtimeContext: IRuntimeContext = useMemo(
    () => ({
      basePath,
      catalogLibrary,
      selectedCatalog,
      setSelectedCatalog,
    }),
    [basePath, catalogLibrary, selectedCatalog, setSelectedCatalog],
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
