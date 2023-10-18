import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from './camel-utils';
import { ITile } from './components/Catalog';
import { Shell } from './layout/Shell';
import { CatalogKind } from './models';
import { CatalogSchemaLoaderProvider } from './providers/catalog-schema-loader.provider';
import { CatalogTilesProvider } from './providers/catalog-tiles.provider';
import { EntitiesProvider } from './providers/entities.provider';
import { useCatalogStore } from './store';

function App() {
  const { catalogs } = useCatalogStore((state) => state);
  const [tiles, setTiles] = useState<Record<string, ITile[]>>({});

  useEffect(() => {
    setTiles({
      Component: Object.values(catalogs[CatalogKind.Component] ?? {}).map(camelComponentToTile),
      Processor: Object.values(catalogs[CatalogKind.Processor] ?? {}).map(camelProcessorToTile),
      Kamelet: Object.values(catalogs[CatalogKind.Kamelet] ?? {}).map(kameletToTile),
    });
  }, [catalogs]);

  return (
    <EntitiesProvider>
      <Shell>
        <CatalogSchemaLoaderProvider>
          <CatalogTilesProvider tiles={tiles}>
            <Outlet />
          </CatalogTilesProvider>
        </CatalogSchemaLoaderProvider>
      </Shell>
    </EntitiesProvider>
  );
}

export default App;
