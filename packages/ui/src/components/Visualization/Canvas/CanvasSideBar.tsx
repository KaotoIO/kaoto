import './CanvasSideBar.scss';

import { FilteredFieldProvider } from '@kaoto/forms';
import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';

import { IVisualizationNode } from '../../../models';
import { CanvasSidePanelErrorBoundary } from './CanvasSidePanelErrorBoundary';
import { CanvasForm } from './Form/CanvasForm';

interface CanvasSideBarProps {
  vizNode: IVisualizationNode | undefined;
  onClose: () => void;
}

export const CanvasSideBar: FunctionComponent<CanvasSideBarProps> = ({ vizNode, onClose }) => {
  if (vizNode === undefined) {
    return null;
  }

  return (
    /**
     * We cannot use the onClose property since the button has 'position: absolute'
     * and doesn't take into account the sidebar children.
     */
    <TopologySideBar resizable className="canvas-sidebar">
      <CanvasSidePanelErrorBoundary key={vizNode.id} onClose={onClose}>
        <FilteredFieldProvider>
          <CanvasForm vizNode={vizNode} onClose={onClose} />
        </FilteredFieldProvider>
      </CanvasSidePanelErrorBoundary>
    </TopologySideBar>
  );
};
