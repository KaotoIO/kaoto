import { CodeBranchIcon } from '@patternfly/react-icons';
import {
  ContextMenuSeparator,
  DefaultGroup,
  ElementModel,
  GraphElement,
  Layer,
  isNode,
  observer,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent, ReactElement } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasNode } from '../Canvas/canvas.models';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { ItemInsertStep } from './ItemInsertStep';
import { doTruncateLabel } from '../../../utils/truncate-label';

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
          label={doTruncateLabel(label)}
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

export const CustomGroupWithSelection = withSelection()(
  withContextMenu((element: GraphElement<ElementModel, CanvasNode['data']>) => {
    const items: ReactElement[] = [];
    const vizNode = element.getData()?.vizNode;
    if (!vizNode) return items;

    const nodeInteractions = vizNode.getNodeInteraction();

    if (nodeInteractions.canHaveSpecialChildren) {
      items.push(
        <ItemInsertStep
          key="context-menu-item-insert-special"
          data-testid="context-menu-item-insert-special"
          mode={AddStepMode.InsertSpecialChildStep}
          vizNode={vizNode}
        >
          <CodeBranchIcon /> Add branch
        </ItemInsertStep>,
      );
      items.push(<ContextMenuSeparator key="context-menu-separator-insert" />);
    }

    if (nodeInteractions.canRemoveFlow) {
      items.push(
        <ItemDeleteGroup
          key="context-menu-container-remove"
          data-testid="context-menu-container-remove"
          vizNode={vizNode}
        />,
      );
    }

    return items;
  })(CustomGroup),
);
