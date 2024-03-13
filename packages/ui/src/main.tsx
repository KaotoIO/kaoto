import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { FilterDOMPropsKeys, filterDOMProps } from 'uniforms';

filterDOMProps.register(
  'inputRef' as FilterDOMPropsKeys,
  'placeholder' as FilterDOMPropsKeys,
  '$ref' as FilterDOMPropsKeys,
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  /*
   * uniforms is not compatible with StrictMode yet
   * <React.StrictMode>
   * </React.StrictMode>,
   */

  <RouterProvider router={router} />,
);
