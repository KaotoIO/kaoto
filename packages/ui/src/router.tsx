import { createHashRouter } from 'react-router-dom';

import App from './App';
import { ErrorPage } from './pages/ErrorPage';
import { ReloadProvider } from './providers';
import { Links } from './router/links.models';

export const router = createHashRouter([
  {
    path: Links.Home,
    element: (
      <ReloadProvider>
        <App />
      </ReloadProvider>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => import('./pages/Design'),
      },
      {
        path: Links.SourceCode,
        lazy: async () => import('./pages/SourceCode'),
      },
      {
        path: Links.RestImport,
        lazy: async () => import('./pages/RestDslImport'),
      },
      {
        path: Links.Catalog,
        lazy: async () => import('./pages/Catalog'),
      },
      {
        path: Links.Beans,
        lazy: async () => import('./pages/Beans'),
      },
      {
        path: Links.Metadata,
        lazy: async () => import('./pages/Metadata'),
      },
      {
        path: Links.PipeErrorHandler,
        lazy: async () => import('./pages/PipeErrorHandler'),
      },
      {
        path: Links.Settings,
        lazy: async () => import('./pages/Settings'),
      },
      {
        path: Links.DataMapper,
        lazy: async () => {
          if (import.meta.env.VITE_ENABLE_DATAMAPPER_DEBUGGER === 'true') {
            return import('./components/DataMapper/debug/page');
          } else {
            return import('./pages/DataMapperNotYetInBrowser');
          }
        },
      },
      {
        path: `${Links.DataMapper}/:id`,
        lazy: async () => import('./pages/DataMapper'),
      },
    ],
  },
]);
