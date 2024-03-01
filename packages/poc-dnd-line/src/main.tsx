import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { createRoot } from 'react-dom/client';
import { SourceTarget } from './SourceTarget';
import { DndContext, useDndMonitor } from '@dnd-kit/core';
import { FunctionComponent } from 'react';
import { Link, Route, BrowserRouter, Routes } from 'react-router-dom';
import { DnDKitTest } from './DnDKitTest';

const container = document.getElementById('root');
const root = createRoot(container!);
const DnDMonitor: FunctionComponent = () => {
  useDndMonitor({
    onDragStart(event) {
      console.log('onDragStart:' + event);
    },
    onDragMove(event) {
      console.log('onDragMove:' + event);
    },
    onDragOver(event) {
      console.log('onDragOver:' + event);
    },
    onDragEnd(event) {
      console.log('onDragEnd:' + event);
    },
    onDragCancel(event) {
      console.log('onDragCancel:' + event);
    },
  });
  return <></>;
};

const Layout: FunctionComponent = () => (
  <nav>
    <ul>
      <li>
        <Link to="/SourceTarget">SourceTarget</Link>
      </li>
      <li>
        <Link to="/dndkit">dndkit</Link>
      </li>
    </ul>
  </nav>
);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}></Route>
      <Route
        path="/SourceTarget"
        element={
          <DndContext>
            <DnDMonitor></DnDMonitor>
            <SourceTarget></SourceTarget>
          </DndContext>
        }
      />
      <Route path="/dndkit" element={<DnDKitTest></DnDKitTest>} />
    </Routes>
  </BrowserRouter>,
);
