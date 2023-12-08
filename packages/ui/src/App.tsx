import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogTilesProvider } from './providers/catalog-tiles.provider';
import { CatalogLoaderProvider } from './providers/catalog.provider';
import { EntitiesProvider } from './providers/entities.provider';
import { SchemasLoaderProvider } from './providers/schemas.provider';
import { SourceCodeProvider } from './providers/source-code.provider';
import { CatalogSchemaLoader } from './utils/catalog-schema-loader';
import { VisibleFlowsProvider } from './providers';

function App() {
  return (
    <SourceCodeProvider>
      <EntitiesProvider>
        <Shell>
          <SchemasLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
            <CatalogLoaderProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
              <CatalogTilesProvider>
                <VisibleFlowsProvider>
                  <Outlet />
                </VisibleFlowsProvider>
              </CatalogTilesProvider>
            </CatalogLoaderProvider>
          </SchemasLoaderProvider>
        </Shell>
      </EntitiesProvider>
    </SourceCodeProvider>
  );
}

export default App;
