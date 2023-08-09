import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { ComponentsCatalogProvider } from './providers/components-catalog.provider';

function App() {
  return (
    <Shell>
      <ComponentsCatalogProvider>
        <Outlet />
      </ComponentsCatalogProvider>
    </Shell>
  );
}

export default App;
