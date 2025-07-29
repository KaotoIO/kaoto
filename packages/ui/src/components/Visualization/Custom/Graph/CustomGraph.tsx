import type { ElementModel, GraphElement } from '@patternfly/react-topology';
import { GraphComponent, withContextMenu, withPanZoom } from '@patternfly/react-topology';
import { ReactElement } from 'react';
import { NewEntity } from '../../ContextToolbar/NewEntity/NewEntity';
import { ShowOrHideAllFlows } from './ShowOrHideAllFlows';

export const GraphContextMenuFn = (element: GraphElement<ElementModel, unknown>): ReactElement[] => {
  const items: ReactElement[] = [];

  items.push(
    <ShowOrHideAllFlows key="showAll" data-testid="context-menu-item-show-all" mode="showAll">
      Show all
    </ShowOrHideAllFlows>,
  );

  items.push(
    <ShowOrHideAllFlows key="hideAll" data-testid="context-menu-item-hide-all" mode="hideAll">
      Hide all
    </ShowOrHideAllFlows>,
  );

  items.push(<NewEntity />);
  return items;
};

export const CustomGraphWithSelection = withPanZoom()(withContextMenu(GraphContextMenuFn)(GraphComponent));
