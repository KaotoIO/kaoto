import { DefaultEdge, Edge, EdgeModel, EdgeTerminalType } from '@patternfly/react-topology';
import { Label } from '@patternfly/react-core';
import './CustomEdge.scss';
import { CanvasDefaults } from '../Canvas/canvas.defaults';

const noopFn = () => {
  console.log('CLICKED EDGE!');
};

interface CustomEdgeProps {
  element: Edge;
}

const calculateX = (element: Edge<EdgeModel, any>): number => {
  const startX = element.getStartPoint().x;
  const stopX = element.getEndPoint().x;
  const diffX = stopX - startX;
  const margin = 12;

  if (diffX === 0) {
    // straight line without bendpoints
    return startX - margin;
  } else {
    // bendpoints
    return stopX - diffX / 2 - margin;
  }
};

const calculateY = (element: Edge<EdgeModel, any>): number => {
  const startY = element.getStartPoint().y;
  const stopY = element.getEndPoint().y;
  const diffY = stopY - startY;
  const margin = 6;

  return stopY - diffY / 2 - margin;
};

export const CustomEdge: React.FC<CustomEdgeProps> = ({ element, ...rest }) => (
  <DefaultEdge
    {...rest}
    element={element}
    startTerminalType={EdgeTerminalType.none}
    endTerminalType={EdgeTerminalType.directional}
  >
    <g data-testid={`custom-edge__${element?.getId()}`}>
      <foreignObject
        className="custom-edge__fo"
        x={calculateX(element)}
        y={calculateY(element)}
        width={CanvasDefaults.DEFAULT_NODE_DIAMETER}
        height={CanvasDefaults.DEFAULT_NODE_DIAMETER}
      >
        <Label className="custom-edge__label" onClick={noopFn}>
          +
        </Label>
      </foreignObject>
    </g>
  </DefaultEdge>
);
