import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogTilesProvider } from './providers/catalog-tiles.provider';
import { CatalogLoaderProvider } from './providers/catalog.provider';
import { EntitiesProvider } from './providers/entities.provider';
import { SchemasLoaderProvider } from './providers/schemas.provider';

function App() {
  return (
    <EntitiesProvider>
      <Shell>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <CatalogTilesProvider>
              <Outlet />
            </CatalogTilesProvider>
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </Shell>
    </EntitiesProvider>
  );
}

export default App;
