import '@patternfly/react-core/dist/styles/base.css'; // This import needs to be first
import { createRoot } from 'react-dom/client';
import { SourceTargetContainer } from './SourceTarget';
import { FunctionComponent } from 'react';
import { Link, Route, BrowserRouter, Routes } from 'react-router-dom';
import { DnDKitTest } from './DnDKitTest';
import { ReactTopologyTest } from './ReactTopologyTest';
import { Page } from '@patternfly/react-core';
import { DrawLines } from './DrawLines';
import { CanvasProvider } from './canvas/CanvasProvider';

const container = document.getElementById('root');
const root = createRoot(container!);

const Layout: FunctionComponent = () => (
  <Page>
    <nav>
      <ul>
        <li>
          <Link to="/SourceTarget">SourceTarget</Link>
        </li>
        <li>
          <Link to="/dndkit">dndkit</Link>
        </li>
        <li>
          <Link to="/line">line</Link>
        </li>
        <li>
          <Link to="/topology">React Topology</Link>
        </li>
      </ul>
    </nav>
  </Page>
);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}></Route>
      <Route path="/SourceTarget" element={<SourceTargetContainer />} />
      <Route path="/dndkit" element={<DnDKitTest></DnDKitTest>} />
      <Route
        path="/line"
        element={
          <CanvasProvider>
            <DrawLines />
          </CanvasProvider>
        }
      />
      <Route path="/topology" element={<ReactTopologyTest></ReactTopologyTest>} />
    </Routes>
  </BrowserRouter>,
);
