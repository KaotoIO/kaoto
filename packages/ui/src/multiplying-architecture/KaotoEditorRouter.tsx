import { createHashRouter } from 'react-router-dom';
import { ErrorPage } from '../pages/ErrorPage';
import { Links } from '../router/links.models';
import { KaotoEditor } from './KaotoEditor';

export const kaotoEditorRouter = createHashRouter([
  {
    path: Links.Home,
    element: <KaotoEditor />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => import('../pages/Design/router-exports-multiplying-architecture'),
      },
      {
        path: Links.Beans,
        lazy: async () => import('../pages/Beans'),
      },
      {
        path: Links.Metadata,
        lazy: async () => import('../pages/Metadata'),
      },
      {
        path: Links.PipeErrorHandler,
        lazy: async () => import('../pages/PipeErrorHandler'),
      },
      {
        path: Links.DataMapper,
        lazy: async () => import('../pages/DataMapperHowTo'),
      },
      {
        path: `${Links.DataMapper}/:id`,
        lazy: async () => import('../pages/DataMapper'),
      },
    ],
  },
]);
