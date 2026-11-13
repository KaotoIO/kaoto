import { Add, View, ViewOff } from '@carbon/icons-react';
import { Divider } from '@patternfly/react-core';
import { ElementContext, GraphComponent } from '@patternfly/react-topology';
import { createContext, FunctionComponent, PropsWithChildren, ReactElement, useContext, useMemo } from 'react';

import { IDataTestID } from '../../../../models';
import { CanvasToolbarProvider } from '../../../../providers/canvas-toolbar.provider';
import { CanvasToolbar } from '../../Canvas/CanvasToolbar/CanvasToolbar';
import { CanvasContextSubMenuItem } from '../ContextMenu/CanvasContextSubMenuItem';
import { withNodeContextMenu } from '../ContextMenu/withNodeContextMenu';
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
      <View />
      <span className="pf-v6-u-m-sm">Show all</span>
    </ShowOrHideAllFlows>,
    <ShowOrHideAllFlows key="hideAll" data-testid="context-menu-item-hide-all" mode="hideAll">
      <ViewOff />
      <span className="pf-v6-u-m-sm">Hide all</span>
    </ShowOrHideAllFlows>,
    <ItemPasteEntity key="paste-entity" data-testid="context-menu-item-paste" />,
  ];

  const entities = entityContextMenuFn();

  if (entities.length > 0) {
    items.push(
      <Divider key="new-entity-divider" component="li" />,
      <CanvasContextSubMenuItem
        key="new-entity"
        data-testid="context-menu-item-new-entity"
        label={
          <>
            <Add />
            <span className="pf-v6-u-m-sm">New</span>
          </>
        }
      >
        {entities}
      </CanvasContextSubMenuItem>,
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
const EnhancedGraphComponent = withNodeContextMenu(() => [<GraphContextMenu key="graph-menu" />], {
  label: 'Canvas actions',
})(PanZoomGraphComponent);

const BaseCustomGraph: FunctionComponent<WithEntityContextMenuProps> = ({ entityContextMenuFn, ...rest }) => {
  const element = useContext(ElementContext);
  const menuOptions = useMemo(() => ({ entityContextMenuFn }), [entityContextMenuFn]);
  return (
    <CanvasToolbarProvider>
      <GraphMenuContext.Provider value={menuOptions}>
        <EnhancedGraphComponent {...rest} element={element} />
      </GraphMenuContext.Provider>
      <CanvasToolbar />
    </CanvasToolbarProvider>
  );
};

export const CustomGraphWithSelection = withEntityContextMenu(BaseCustomGraph);
