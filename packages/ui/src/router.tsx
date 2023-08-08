import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorPage } from './pages/ErrorPage';
import { Links } from './router/links';

export const router = createBrowserRouter([
  {
    path: Links.Home,
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => import('./pages/Dashboard'),
      },
    ],
  },
]);
