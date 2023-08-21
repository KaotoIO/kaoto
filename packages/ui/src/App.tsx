import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogSchemaLoaderProvider } from './providers/catalog-schema-loader.provider';

function App() {
  return (
    <Shell>
      <CatalogSchemaLoaderProvider>
        <Outlet />
      </CatalogSchemaLoaderProvider>
    </Shell>
  );
}

export default App;
