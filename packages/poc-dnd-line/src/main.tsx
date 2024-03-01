import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { createRoot } from 'react-dom/client';
import { DnDCodeSample } from './dnd';
import { SourceTarget } from './SourceTarget';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<SourceTarget></SourceTarget>);
