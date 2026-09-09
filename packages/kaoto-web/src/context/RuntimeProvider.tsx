import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

import { RuntimeContext } from './RuntimeContext';

export interface IRuntimeProvider {
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
}

export const RuntimeProvider: FunctionComponent<PropsWithChildren<IRuntimeProvider>> = ({
  catalogUrl: _catalogUrl,
  runtimeCatalogName: _runtimeCatalogName,
  testingCatalogName: _testingCatalogName,
  children,
}) => {
  // TODO: fetch `catalogUrl`, resolve the active catalog entry from `runtimeCatalogName` /
  // `testingCatalogName` (mirroring runtime.provider.tsx in @kaoto/kaoto), show a loading
  // screen while fetching, and surface an error state on failure. These require
  // useKaotoResourceContext, SourceSchemaType and the catalog-fetch infrastructure to be
  // ported to kaoto-web first.
  const [catalogLibrary] = useState<CatalogLibrary | undefined>(undefined);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogLibraryEntry | undefined>({
    name: 'Camel Main',
    version: '4.18.3.redhat-00005',
    runtime: 'main',
    fileName: '',
  });

  const basePath = _catalogUrl ? _catalogUrl.substring(0, _catalogUrl.lastIndexOf('/')) : '';

  const value = useMemo(
    () => ({ basePath, catalogLibrary, selectedCatalog, setSelectedCatalog }),
    [basePath, catalogLibrary, selectedCatalog],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
};
