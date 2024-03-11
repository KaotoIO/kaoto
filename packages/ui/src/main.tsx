import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { DataMapper } from './components';
import { createRoot } from 'react-dom/client';
import { DataMapperProvider } from './providers';
import { CanvasProvider } from './providers/CanvasProvider';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <DataMapperProvider>
    <CanvasProvider>
      <DataMapper />
    </CanvasProvider>
  </DataMapperProvider>,
);
