import { createHashRouter } from 'react-router';

import { ErrorPage } from '../../pages/ErrorPage';
import { Links } from '../../router/links.models';
import { KaotoEditorLayout } from './KaotoEditorLayout';

/**
 * Creates the router of the editor.
 *
 * React Router starts loading the lazy page of the current route as soon as a router is created. The webview entry
 * creates it when it starts the editor, instead of this module when it loads, so a plain import of the editor does
 * not load the Design page.
 */
export const createKaotoEditorRouter = () =>
  createHashRouter([
    {
      path: Links.Home,
      element: <KaotoEditorLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          lazy: async () => import('../../pages/Design/router-exports-embedded'),
        },
        {
          path: Links.Beans,
          lazy: async () => import('../../pages/Beans'),
        },
        {
          path: Links.RestEditor,
          lazy: async () => import('../../pages/RestDslEditor'),
        },
        {
          path: Links.Metadata,
          lazy: async () => import('../../pages/Metadata'),
        },
        {
          path: Links.PipeErrorHandler,
          lazy: async () => import('../../pages/PipeErrorHandler'),
        },
        {
          path: Links.DataMapper,
          lazy: async () => import('../../pages/DataMapperHowTo'),
        },
        {
          path: Links.About,
          lazy: async () => import('../../pages/About'),
        },
        {
          path: `${Links.DataMapper}/:id`,
          lazy: async () => import('../../pages/DataMapper'),
        },
      ],
    },
  ]);
