import { Add, View, ViewOff } from '@carbon/icons-react';
import { Divider } from '@patternfly/react-core';
import { ElementContext, GraphComponent } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactElement, useContext } from 'react';

import { useCanvasEntities } from '../../../../hooks/useCanvasEntities';
import { IDataTestID } from '../../../../models';
import { CanvasToolbarProvider } from '../../../../providers/canvas-toolbar.provider';
import { CanvasToolbar } from '../../Canvas/CanvasToolbar/CanvasToolbar';
import { CanvasContextSubMenu as ContextSubMenuItem } from '../ContextMenu/CanvasContextMenu';
import { withNodeContextMenu } from '../ContextMenu/withNodeContextMenu';
import { withCustomPanZoom } from './customUsePanZoom';
import { generateEntityContextMenu } from './generateEntityContextMenu';
import { ItemPasteEntity } from './ItemPasteEntity';
import { ShowOrHideAllFlows } from './ShowOrHideAllFlows';

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
      <Divider key="new-entity-divider" />,
      <ContextSubMenuItem
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
      </ContextSubMenuItem>,
    );
  }

  return items;
};

const PanZoomGraphComponent = withCustomPanZoom({ enableSpacebarPanning: true })(GraphComponent);

export const CanvasBackgroundMenu = () => {
  const entityData = useCanvasEntities();
  return <>{GraphContextMenuFn({ entityContextMenuFn: () => generateEntityContextMenu(entityData) })}</>;
};
const EnhancedGraphComponent = withNodeContextMenu(() => [<CanvasBackgroundMenu key="graph-menu" />], {
  canvasBackground: true,
})(PanZoomGraphComponent);

export const CustomGraphWithSelection: FunctionComponent = (props) => {
  const element = useContext(ElementContext);
  return (
    <CanvasToolbarProvider>
      <EnhancedGraphComponent {...props} element={element} />
      <CanvasToolbar />
    </CanvasToolbarProvider>
  );
};
