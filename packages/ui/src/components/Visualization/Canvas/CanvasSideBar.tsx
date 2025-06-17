import { FilteredFieldProvider } from '@kaoto/forms';
import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { ErrorBoundary } from '../../ErrorBoundary';
import { CanvasNode } from './canvas.models';
import './CanvasSideBar.scss';
import { CanvasForm } from './Form/CanvasForm';

interface CanvasSideBarProps {
  selectedNode: CanvasNode | undefined;
  onClose: () => void;
}

export const CanvasSideBar: FunctionComponent<CanvasSideBarProps> = (props) => {
  if (props.selectedNode === undefined) {
    return null;
  }

  return (
    /**
     * We cannot use the onClose property since the button has 'position: absolute'
     * and doesn't take into account the sidebar children.
     */
    <TopologySideBar resizable className="canvas-sidebar">
      <ErrorBoundary key={props.selectedNode.id} fallback={<p>Something did not work as expected</p>}>
        <FilteredFieldProvider>
          <CanvasForm selectedNode={props.selectedNode} onClose={props.onClose} />
        </FilteredFieldProvider>
      </ErrorBoundary>
    </TopologySideBar>
  );
};
