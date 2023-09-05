import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogSchemaLoaderProvider, EntitiesProvider } from './providers';

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
