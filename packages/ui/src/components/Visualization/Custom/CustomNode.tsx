import { DefaultNode, Node, WithSelectionProps, withSelection } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import defaultCamelIcon from '../../../assets/camel-logo.svg';
import { CanvasNode } from '../Canvas/canvas.models';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}

function getIcon(data: IVisualizationNode | undefined) {
  const iconRadius = 20;
  const cx = 25 / 2;
  const cy = 25 / 2;

  const icon = data?.iconData ?? defaultCamelIcon;
  return (
    <image xlinkHref={icon} x={cx - iconRadius} y={cy - iconRadius} width={iconRadius * 2} height={iconRadius * 2} />
  );
}

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }) => {
  const data = element.getData()?.vizNode;

  return (
    <DefaultNode element={element} showStatusDecorator {...rest}>
      <g transform={`translate(25, 25)`}>{getIcon(data)}</g>
    </DefaultNode>
  );
};

export const CustomNodeWithSelection: typeof DefaultNode = withSelection()(CustomNode) as typeof DefaultNode;
