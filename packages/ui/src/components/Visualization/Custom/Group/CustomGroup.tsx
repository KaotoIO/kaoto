import {
  DefaultGroup,
  GraphElement,
  isNode,
  observer,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { CustomGroupCollapsible } from './CustomGroupCollapsible';

type IDefaultGroup = Parameters<typeof DefaultGroup>[0];
interface ICustomGroup extends IDefaultGroup {
  element: GraphElement<CanvasNode, CanvasNode['data']>;
}

const CustomGroup: FunctionComponent<ICustomGroup> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const label = vizNode?.getNodeLabel();

  if (!isNode(element)) {
    throw new Error('CustomGroup must be used only on Node elements');
  }

  return (
    <CustomGroupCollapsible
      {...rest}
      element={element}
      label={label}
      collapsible
      collapsedWidth={CanvasDefaults.DEFAULT_NODE_WIDTH}
      collapsedHeight={CanvasDefaults.DEFAULT_NODE_HEIGHT}
      hulledOutline={false}
    />
  );
});

export const CustomGroupWithSelection = withSelection()(withContextMenu(NodeContextMenuFn)(CustomGroup));
