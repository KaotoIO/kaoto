import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogSchemaLoaderProvider } from './providers/catalog-schema-loader.provider';
import { EntitiesProvider } from './providers/entities.provider';

function App() {
  return (
    <EntitiesProvider>
      <Shell>
        <CatalogSchemaLoaderProvider>
          <Outlet />
        </CatalogSchemaLoaderProvider>
      </Shell>
    </EntitiesProvider>
  );
}

export default App;
