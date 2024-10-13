import { DefaultEdge, Edge, EdgeModel, EdgeTerminalType, observer } from '@patternfly/react-topology';
import { Button, Tooltip } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import './CustomEdge.scss';
import { addNode } from '../ContextMenu/ItemAddStep';
import { CatalogModalContext, EntitiesContext } from '../../../../providers';
import { useContext } from 'react';
import { IVisualizationNode } from '../../../../models';

interface EdgeEndProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: Edge<EdgeModel, any>;
}

const EdgeEnd: React.FC<EdgeEndProps> = observer(({ element, ...rest }) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const vizNode: IVisualizationNode = element.getSource().getData()?.vizNode;
  const isHorizontal = element.getGraph().getLayout() === 'DagreHorizontal';
  const endPoint = element.getEndPoint();
  let x, y;
  if (isHorizontal) {
    x = endPoint.x;
    y = endPoint.y - 12;
  } else {
    x = endPoint.x - 12;
    y = endPoint.y;
  }
  const onAdd = () => {
    addNode(catalogModalContext, entitiesContext, vizNode);
  };
  return (
    <DefaultEdge
      element={element}
      startTerminalType={EdgeTerminalType.none}
      endTerminalType={EdgeTerminalType.none}
      className="custom-edge"
      {...rest}
    >
      <g data-testid={`custom-edge__${element?.getId()}`}>
        <foreignObject x={x} y={y} width="24" height="24" className="custom-edge">
          <Tooltip content="Append">
            <Button variant="plain" className="custom-edge__end" onClick={onAdd}>
              <PlusIcon size={40} />
            </Button>
          </Tooltip>
        </foreignObject>
      </g>
    </DefaultEdge>
  );
});

export const EdgeEndWithButton: typeof DefaultEdge = EdgeEnd as typeof DefaultEdge;
