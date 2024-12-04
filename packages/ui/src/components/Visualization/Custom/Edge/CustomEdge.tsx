import { Icon } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  DefaultConnectorTerminal,
  DefaultEdge,
  EdgeModel,
  EdgeTerminalType,
  getClosestVisibleParent,
  GraphElement,
  isEdge,
  observer,
  Point,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models';
import { LayoutType } from '../../Canvas';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { AddStepIcon } from './AddStepIcon';
import './CustomEdge.scss';

type DefaultEdgeProps = Parameters<typeof DefaultEdge>[0];
interface CustomEdgeProps extends DefaultEdgeProps {
  /** We're not providing Data to edges */
  element: GraphElement<EdgeModel, unknown>;
}

export const CustomEdge: FunctionComponent<CustomEdgeProps> = observer(({ element }) => {
  if (!isEdge(element)) {
    throw new Error('EdgeEndWithButton must be used only on Edge elements');
  }

  /* If the edge connects to nodes in a collapsed group don't draw */
  const sourceParent = getClosestVisibleParent(element.getSource());
  const targetParent = getClosestVisibleParent(element.getTarget());
  if (sourceParent?.isCollapsed() && sourceParent === targetParent) {
    return null;
  }

  const startPoint = element.getStartPoint();
  const endPoint = element.getEndPoint();
  const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

  let x = startPoint.x + (endPoint.x - startPoint.x - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2;
  let y = startPoint.y + (endPoint.y - startPoint.y - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2;
  if (isHorizontal) {
    /** If the layout is horizontal, we need to pull the AddStepIcon to the left to substract the edge connector width */
    x -= 6;
  } else if (element.getSource().isGroup()) {
    /** If the edge starts from a group, we need to pull the AddStepIcon to the top to substract the edge connector height */
    y -= 6;
  } else {
    /** If the edge starts from a node, we need to push the AddStepIcon to the bottom to save the node label */
    y += 4;
  }

  const vizNode: IVisualizationNode | undefined = element.getTarget().getData().vizNode;
  const shouldShowPrepend = !vizNode?.data.isPlaceholder && vizNode?.getNodeInteraction().canHavePreviousStep;

  const bendpoints = element
    .getBendpoints()
    .concat(endPoint)
    .map((b: Point) => `L${b.x} ${b.y}`)
    .join(' ');
  const d = `M${startPoint.x} ${startPoint.y} ${bendpoints}`;

  return (
    <g className="custom-edge">
      <path className="custom-edge__background" d={d} />
      <path className="custom-edge__body" d={d} />
      <DefaultConnectorTerminal isTarget={false} edge={element} size={14} terminalType={EdgeTerminalType.none} />
      <DefaultConnectorTerminal isTarget edge={element} size={14} terminalType={EdgeTerminalType.directional} />

      {shouldShowPrepend && (
        <foreignObject x={x} y={y} width={CanvasDefaults.ADD_STEP_ICON_SIZE} height={CanvasDefaults.ADD_STEP_ICON_SIZE}>
          <AddStepIcon
            className="custom-edge__add-step"
            title="Add step"
            vizNode={vizNode}
            mode={AddStepMode.PrependStep}
          >
            <Icon size="lg">
              <PlusCircleIcon />
            </Icon>
          </AddStepIcon>
        </foreignObject>
      )}
    </g>
  );
});
