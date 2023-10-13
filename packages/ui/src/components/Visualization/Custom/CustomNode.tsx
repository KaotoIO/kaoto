import { MinusIcon } from '@patternfly/react-icons';
import {
  ContextMenuItem,
  DefaultNode,
  ElementContext,
  ElementModel,
  GraphElement,
  Node,
  WithSelectionProps,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext } from 'react';
import defaultCamelIcon from '../../../assets/camel-logo.svg';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasNode } from '../Canvas/canvas.models';
import { CanvasService } from '../Canvas/canvas.service';
import './CustomNode.scss';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }) => {
  const data = element.getData()?.vizNode;
  const icon = data?.iconData ?? defaultCamelIcon;

  return (
    <DefaultNode element={element} showStatusDecorator {...rest}>
      <g data-testid={`custom-node__${data?.id}`}>
        <foreignObject
          x="0"
          y="0"
          width={CanvasService.DEFAULT_NODE_DIAMETER}
          height={CanvasService.DEFAULT_NODE_DIAMETER}
        >
          <div className="custom-node__image">
            <img
              src={icon}
              width={CanvasService.DEFAULT_NODE_DIAMETER * 0.7}
              height={CanvasService.DEFAULT_NODE_DIAMETER * 0.7}
            />
          </div>
        </foreignObject>
      </g>
    </DefaultNode>
  );
};

const RemoveNode: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const element: GraphElement<ElementModel, CanvasNode['data']> = useContext(ElementContext);
  const vizNode = element.getData()?.vizNode;

  const onRemoveNode = useCallback(() => {
    vizNode?.removeChild(vizNode);
    entitiesContext?.updateCodeFromEntities();
  }, [entitiesContext, vizNode]);

  return (
    <ContextMenuItem onClick={onRemoveNode}>
      <MinusIcon /> Remove node
    </ContextMenuItem>
  );
};

export const CustomNodeWithSelection: typeof DefaultNode = withContextMenu(() => [
  <RemoveNode key="context-menu-item-remove" />,
])(withSelection()(CustomNode) as typeof DefaultNode) as typeof DefaultNode;
