import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogTilesProvider } from './providers/catalog-tiles.provider';
import { CatalogLoaderProvider } from './providers/catalog.provider';
import { EntitiesProvider } from './providers/entities.provider';
import { SchemasLoaderProvider } from './providers/schemas.provider';

function App() {
  return (
    <Shell>
      <EntitiesProvider>
        <SchemasLoaderProvider>
          <CatalogLoaderProvider>
            <CatalogTilesProvider>
              <Outlet />
            </CatalogTilesProvider>
          </CatalogLoaderProvider>
        </SchemasLoaderProvider>
      </EntitiesProvider>
    </Shell>
  );
}

export default App;
