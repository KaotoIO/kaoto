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
        lazy: async () => import('./pages/Dashboard'),
      },
      {
        path: Links.ComponentsCatalog,
        lazy: async () => import('./pages/ComponentsCatalog'),
      },
    ],
  },
]);
