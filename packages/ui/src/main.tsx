import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { DataMapper } from './components';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<DataMapper />);
