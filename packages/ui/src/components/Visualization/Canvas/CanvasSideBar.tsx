import { Button, Card, CardBody, CardTitle } from '@patternfly/react-core';
import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { TimesIcon } from '@patternfly/react-icons';
import { ErrorBoundary } from '../../ErrorBoundary';

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
    <TopologySideBar show={props.selectedNode !== undefined}>
      <Card>
        <CardTitle>
          {props.selectedNode?.label}{' '}
          <Button
            variant="plain"
            icon={<TimesIcon />}
            onClick={() => {
              props.onClose();
            }}
          />
        </CardTitle>

        <CardBody>
          {props.selectedNode === undefined ? null : (
            <ErrorBoundary fallback={<p>Something didn't work as expected</p>}>
              <CanvasForm selectedNode={props.selectedNode} />
            </ErrorBoundary>
          )}
        </CardBody>
      </Card>
    </TopologySideBar>
  );
};
