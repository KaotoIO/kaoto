import {
  DefaultGroup,
  GraphElement,
  Layer,
  isNode,
  observer,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasNode } from '../Canvas/canvas.models';
import { ItemInsertChildNode } from './ItemInsertChildNode';
import { ItemRemoveGroup } from './ItemRemoveGroup';

type IDefaultGroup = Parameters<typeof DefaultGroup>[0];
interface ICustomGroup extends IDefaultGroup {
  element: GraphElement<CanvasNode, CanvasNode['data']>;
}

const CustomGroup: FunctionComponent<ICustomGroup> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const label = vizNode?.getNodeLabel();

  if (!isNode(element)) {
    throw new Error('DefaultGroup must be used only on Node elements');
  }

  return (
    <g>
      <Layer>
        <DefaultGroup
          {...rest}
          element={element}
          label={label}
          truncateLength={15}
          showLabel={true}
          collapsible
          collapsedWidth={50}
          collapsedHeight={50}
          hulledOutline={false}
        />
      </Layer>
    </g>
  );
});

export const CustomGroupWithSelection = withContextMenu(() => [
  <ItemInsertChildNode
    key="context-menu-item-insert-special"
    data-testid="context-menu-item-insert-special"
    mode={AddStepMode.InsertSpecialChildStep}
  />,
  <ItemRemoveGroup key="context-menu-container-remove" data-testid="context-menu-container-remove" />,
])(withSelection()(CustomGroup));
