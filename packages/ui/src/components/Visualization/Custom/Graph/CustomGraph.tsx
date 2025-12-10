import { Divider } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import {
  ContextSubMenuItem,
  ElementContext,
  GraphComponent,
  withContextMenu,
  withPanZoom,
} from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactElement, useContext } from 'react';

import { IDataTestID } from '../../../../models';
import { ShowOrHideAllFlows } from './ShowOrHideAllFlows';
import { withEntityContextMenu, WithEntityContextMenuProps } from './withEntityContextMenu';

export const GraphContextMenuFn = (
  entityContextMenuFn: () => ReactElement[],
): ReactElement<PropsWithChildren<IDataTestID>>[] => {
  const items: ReactElement<PropsWithChildren<IDataTestID>>[] = [
    <ShowOrHideAllFlows key="showAll" data-testid="context-menu-item-show-all" mode="showAll">
      <EyeIcon />
      <span className="pf-v6-u-m-sm">Show all</span>
    </ShowOrHideAllFlows>,
    <ShowOrHideAllFlows key="hideAll" data-testid="context-menu-item-hide-all" mode="hideAll">
      <EyeSlashIcon />
      <span className="pf-v6-u-m-sm">Hide all</span>
    </ShowOrHideAllFlows>,
  ];

  const entities = entityContextMenuFn();

  if (entities.length > 0) {
    items.push(<Divider key="new-entity-divider" />);
    items.push(
      <ContextSubMenuItem
        key="new-entity"
        data-testid="context-menu-item-new-entity"
        label={
          <>
            <PlusIcon />
            <span className="pf-v6-u-m-sm">New</span>
          </>
        }
      >
        {entities}
      </ContextSubMenuItem>,
    );
  }

  return items;
};

const BaseCustomGraph: FunctionComponent<WithEntityContextMenuProps> = ({ entityContextMenuFn, ...rest }) => {
  const contextMenuFn = () => GraphContextMenuFn(entityContextMenuFn);
  const element = useContext(ElementContext);
  const EnhancedGraphComponent = withPanZoom()(withContextMenu(contextMenuFn)(GraphComponent));

  return <EnhancedGraphComponent {...rest} element={element} />;
};

export const CustomGraphWithSelection = withEntityContextMenu(BaseCustomGraph);
