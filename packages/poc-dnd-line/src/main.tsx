import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { createRoot } from 'react-dom/client';
import { SourceTarget } from './SourceTarget';
import { DndContext } from '@dnd-kit/core';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <DndContext>
    <SourceTarget></SourceTarget>
  </DndContext>,
);
