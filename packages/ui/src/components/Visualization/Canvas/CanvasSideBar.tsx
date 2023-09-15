import { Card, CardBody, CardTitle } from '@patternfly/react-core';
import { TopologySideBar } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';

interface CanvasSideBarProps {
  selectedNode: CanvasNode | undefined;
  onClose: () => void;
}

export const CanvasSideBar: FunctionComponent<CanvasSideBarProps> = (props) => {
  return (
    <TopologySideBar show={props.selectedNode !== undefined} onClose={props.onClose}>
      <Card>
        <CardTitle>{props.selectedNode?.label}</CardTitle>

        <CardBody>
          {props.selectedNode === undefined ? null : <CanvasForm selectedNode={props.selectedNode} />}
        </CardBody>
      </Card>
    </TopologySideBar>
  );
};
