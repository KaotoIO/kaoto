import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CatalogLoaderProvider as CatalogLoaderProvider } from './providers/catalog-loader.provider';

function App() {
  return (
    <Shell>
      <CatalogLoaderProvider>
        <Outlet />
      </CatalogLoaderProvider>
    </Shell>
  );
}

export default App;
