import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { ErrorBoundary } from '../../ErrorBoundary';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import './CanvasSideBar.scss';
import { FilteredFieldProvider } from '../../../providers';
import { FormTypeProvider } from '../../../providers/form-type.provider';

interface CanvasSideBarProps {
  selectedNode: CanvasNode | undefined;
  onClose: () => void;
}

export const CanvasSideBar: FunctionComponent<CanvasSideBarProps> = (props) => {
  return (
    /**
     * We cannot use the onClose property since the button has 'position: absolute'
     * and doesn't take into account the sidebar children.
     */
    <TopologySideBar show={props.selectedNode !== undefined} resizable={true}>
      {props.selectedNode === undefined ? null : (
        <ErrorBoundary key={props.selectedNode.id} fallback={<p>Something didn't work as expected</p>}>
          <FormTypeProvider>
            <FilteredFieldProvider>
              <CanvasForm selectedNode={props.selectedNode} onClose={props.onClose} />
            </FilteredFieldProvider>
          </FormTypeProvider>
        </ErrorBoundary>
      )}
    </TopologySideBar>
  );
};
