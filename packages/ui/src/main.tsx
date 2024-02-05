import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { DataMapper } from './components';
import { DataMapperProvider } from './providers';
import { createRoot } from 'react-dom/client';
import { Page } from '@patternfly/react-core';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <DataMapperProvider>
    <Page>
      <DataMapper />
    </Page>
  </DataMapperProvider>,
);
