import { createHashRouter } from 'react-router-dom';
import App from './App';
import { ErrorPage } from './pages/ErrorPage';
import { Links } from './router/links';

export const router = createHashRouter([
  {
    path: Links.Home,
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => import('./pages/Canvas'),
      },
      {
        path: Links.SourceCode,
        lazy: async () => import('./pages/SourceCode'),
      },
      {
        path: Links.Catalog,
        lazy: async () => import('./pages/Catalog'),
      },
    ],
  },
]);
