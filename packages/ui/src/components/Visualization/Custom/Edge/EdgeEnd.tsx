import { PlusIcon } from '@patternfly/react-icons';
import {
  Decorator,
  DefaultEdge,
  EdgeModel,
  EdgeTerminalType,
  GraphElement,
  isEdge,
  observer,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { IVisualizationNode } from '../../../../models';
import { LayoutType } from '../../Canvas';
import { useAddStep } from '../hooks/add-step.hook';

type DefaultEdgeProps = Parameters<typeof DefaultEdge>[0];
interface EdgeEndProps extends DefaultEdgeProps {
  /** We're not providing Data to edges */
  element: GraphElement<EdgeModel, unknown>;
}

export const EdgeEndWithButton: FunctionComponent<EdgeEndProps> = observer(({ element, ...rest }) => {
  if (!isEdge(element)) {
    throw new Error('EdgeEndWithButton must be used only on Edge elements');
  }
  const vizNode: IVisualizationNode = element.getSource().getData()?.vizNode;
  const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;
  const endPoint = element.getEndPoint();

  const { onAddStep } = useAddStep(vizNode);

  let x = endPoint.x;
  let y = endPoint.y;
  if (isHorizontal) {
    x += 14;
  } else {
    y += 4;
  }

  return (
    <DefaultEdge
      element={element}
      startTerminalType={EdgeTerminalType.none}
      endTerminalType={EdgeTerminalType.none}
      {...rest}
    >
      <g data-testid={`custom-edge__${element?.getId()}`}>
        <Decorator showBackground radius={14} x={x} y={y} icon={<PlusIcon />} onClick={onAddStep} />
      </g>
    </DefaultEdge>
  );
});
