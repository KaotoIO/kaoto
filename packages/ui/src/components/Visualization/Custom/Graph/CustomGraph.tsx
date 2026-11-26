import { Add, View, ViewOff } from '@carbon/icons-react';
import { Divider } from '@patternfly/react-core';
import { ContextSubMenuItem, ElementContext, GraphComponent } from '@patternfly/react-topology';
import {
  ComponentProps,
  createContext,
  FunctionComponent,
  MouseEvent,
  PropsWithChildren,
  ReactElement,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { IDataTestID } from '../../../../models';
import { CanvasToolbarProvider } from '../../../../providers/canvas-toolbar.provider';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasToolbar } from '../../Canvas/CanvasToolbar/CanvasToolbar';
import { MainCanvasContext } from '../../Canvas/main-canvas.context';
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

/**
 * Opens the graph context menu with Shift+F10 or the ContextMenu key while the canvas itself has the focus.
 * Nodes and groups open their own menus, so keys pressed on them are left to them.
 *
 * The canvas root is an ancestor of the graph's SVG, so the listener is attached to it directly.
 */
const KeyboardContextMenuGraphComponent: FunctionComponent<ComponentProps<typeof PanZoomGraphComponent>> = (props) => {
  const { onContextMenu } = props;
  const mainCanvas = useContext(MainCanvasContext);
  const isMainCanvas = mainCanvas !== undefined;
  const isBlocked = mainCanvas?.blocked ?? false;

  useEffect(() => {
    /*
     * Another surface may be mounted from the same component factory, like the off-screen one the image export
     * draws into. Its graph is not the one of `#canvas-main`, so it would open a second menu whose actions act
     * on its own throwaway controller.
     */
    if (!isMainCanvas) return;
    /*
     * The canvas root is outside the `inert` wrapper that blocks the graph, so it keeps taking the focus and its
     * keys while the canvas is blocked. The menu would let the user edit a resource that cannot be written back.
     */
    if (isBlocked) return;

    const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
    if (!canvas) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isContextMenuKey = (event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu';
      if (!isContextMenuKey || event.target !== canvas) return;

      event.preventDefault();
      // Position the context menu at the top-left of the canvas
      const rect = canvas.getBoundingClientRect();
      onContextMenu?.({
        preventDefault: () => {},
        stopPropagation: () => {},
        clientX: rect.left,
        clientY: rect.top,
        currentTarget: canvas,
      } as unknown as MouseEvent);
    };

    canvas.addEventListener('keydown', handleKeyDown);
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBlocked, isMainCanvas, onContextMenu]);

  return <PanZoomGraphComponent {...props} />;
};

const GraphMenuContext = createContext<GraphContextMenuOptions>({ entityContextMenuFn: () => [] });
const GraphContextMenu: FunctionComponent = () => {
  const options = useContext(GraphMenuContext);
  return <>{GraphContextMenuFn(options)}</>;
};
const EnhancedGraphComponent = withNodeContextMenu(() => [<GraphContextMenu key="graph-menu" />])(
  KeyboardContextMenuGraphComponent,
);

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
