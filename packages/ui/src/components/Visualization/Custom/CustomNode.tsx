import { DefaultNode, Node, WithSelectionProps, withContextMenu, withSelection } from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasNode } from '../Canvas/canvas.models';
import { CanvasService } from '../Canvas/canvas.service';
import './CustomNode.scss';
import { ItemAddNode } from './ItemAddNode';
import { ItemInsertChildNode } from './ItemInsertChildNode';
import { ItemRemoveNode } from './ItemRemoveNode';
import { ItemReplaceNode } from './ItemReplaceNode';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;

  return (
    <DefaultNode element={element} showStatusDecorator {...rest}>
      <g data-testid={`custom-node__${vizNode?.id}`}>
        <foreignObject
          x="0"
          y="0"
          width={CanvasService.DEFAULT_NODE_DIAMETER}
          height={CanvasService.DEFAULT_NODE_DIAMETER}
        >
          <div className="custom-node__image">
            <img
              src={vizNode?.data.icon}
              width={CanvasService.DEFAULT_NODE_DIAMETER * 0.7}
              height={CanvasService.DEFAULT_NODE_DIAMETER * 0.7}
            />
          </div>
        </foreignObject>
      </g>
    </DefaultNode>
  );
};

export const CustomNodeWithSelection: typeof DefaultNode = withContextMenu(() => [
  <ItemAddNode
    key="context-menu-item-prepend"
    data-testid="context-menu-item-prepend"
    mode={AddStepMode.PrependStep}
  />,
  <ItemAddNode key="context-menu-item-append" data-testid="context-menu-item-append" mode={AddStepMode.AppendStep} />,
  <ItemInsertChildNode
    key="context-menu-item-insert"
    data-testid="context-menu-item-insert"
    mode={AddStepMode.InsertChildStep}
  />,
  <ItemInsertChildNode
    key="context-menu-item-insert-special"
    data-testid="context-menu-item-insert-special"
    mode={AddStepMode.InsertSpecialChildStep}
  />,
  <ItemReplaceNode key="context-menu-item-replace" data-testid="context-menu-item-replace" />,
  <ItemRemoveNode key="context-menu-item-remove" data-testid="context-menu-item-remove" />,
])(withSelection()(CustomNode) as typeof DefaultNode) as typeof DefaultNode;
