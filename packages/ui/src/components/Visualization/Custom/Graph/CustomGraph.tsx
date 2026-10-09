import { Divider } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { ContextSubMenuItem, ElementContext, GraphComponent, withContextMenu } from '@patternfly/react-topology';
import { createContext, FunctionComponent, PropsWithChildren, ReactElement, useContext, useMemo } from 'react';

import { IDataTestID } from '../../../../models';
import { withCustomPanZoom } from './customUsePanZoom';
import { ItemPasteEntity } from './ItemPasteEntity';
import { ShowOrHideAllFlows } from './ShowOrHideAllFlows';
import { withEntityContextMenu, WithEntityContextMenuProps } from './withEntityContextMenu';

interface GraphContextMenuOptions {
  entityContextMenuFn: () => ReactElement[];
}

export const GraphContextMenuFn = ({
  entityContextMenuFn,
}: GraphContextMenuOptions): ReactElement<PropsWithChildren<IDataTestID>>[] => {
  const items: ReactElement<PropsWithChildren<IDataTestID>>[] = [
    <ShowOrHideAllFlows key="showAll" data-testid="context-menu-item-show-all" mode="showAll">
      <EyeIcon />
      <span className="pf-v6-u-m-sm">Show all</span>
    </ShowOrHideAllFlows>,
    <ShowOrHideAllFlows key="hideAll" data-testid="context-menu-item-hide-all" mode="hideAll">
      <EyeSlashIcon />
      <span className="pf-v6-u-m-sm">Hide all</span>
    </ShowOrHideAllFlows>,
    <ItemPasteEntity key="paste-entity" data-testid="context-menu-item-paste" />,
  ];

  const entities = entityContextMenuFn();

  if (entities.length > 0) {
    items.push(
      <Divider key="new-entity-divider" />,
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

const PanZoomGraphComponent = withCustomPanZoom({ enableSpacebarPanning: true })(GraphComponent);

const GraphMenuContext = createContext<GraphContextMenuOptions>({ entityContextMenuFn: () => [] });
const GraphContextMenu: FunctionComponent = () => {
  const options = useContext(GraphMenuContext);
  return <>{GraphContextMenuFn(options)}</>;
};
const EnhancedGraphComponent = withContextMenu(() => [<GraphContextMenu key="graph-menu" />])(PanZoomGraphComponent);

const BaseCustomGraph: FunctionComponent<WithEntityContextMenuProps> = ({ entityContextMenuFn, ...rest }) => {
  const element = useContext(ElementContext);
  const menuOptions = useMemo(() => ({ entityContextMenuFn }), [entityContextMenuFn]);
  return (
    <GraphMenuContext.Provider value={menuOptions}>
      <EnhancedGraphComponent {...rest} element={element} />
    </GraphMenuContext.Provider>
  );
};

export const CustomGraphWithSelection = withEntityContextMenu(BaseCustomGraph);
