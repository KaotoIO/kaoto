import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import {
  CatalogLoaderProvider,
  CatalogTilesProvider,
  EntitiesProvider,
  RuntimeProvider,
  SchemasLoaderProvider,
  SourceCodeProvider,
  VisibleFlowsProvider,
} from './providers';
import { CatalogSchemaLoader } from './utils/catalog-schema-loader';

function App() {
  return (
    <SourceCodeProvider>
      <EntitiesProvider>
        <Shell>
          <RuntimeProvider catalogUrl={CatalogSchemaLoader.DEFAULT_CATALOG_PATH}>
            <SchemasLoaderProvider>
              <CatalogLoaderProvider>
                <CatalogTilesProvider>
                  <VisibleFlowsProvider>
                    <Outlet />
                  </VisibleFlowsProvider>
                </CatalogTilesProvider>
              </CatalogLoaderProvider>
            </SchemasLoaderProvider>
          </RuntimeProvider>
        </Shell>
      </EntitiesProvider>
    </SourceCodeProvider>
  );
}

export default App;
