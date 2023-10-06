import { CubeIcon } from '@patternfly/react-icons';
import { DefaultNode, Node, WithSelectionProps, withSelection } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { CanvasNode } from '../Canvas/canvas.models';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }) => {
  // const vizNode = element.getData()?.vizNode;

  return (
    <DefaultNode element={element} showStatusDecorator {...rest}>
      <g transform={`translate(25, 25)`}>
        <CubeIcon style={{ color: '#393F44' }} width={25} height={25} />
      </g>
    </DefaultNode>
  );
};

export const CustomNodeWithSelection: typeof DefaultNode = withSelection()(CustomNode) as typeof DefaultNode;
