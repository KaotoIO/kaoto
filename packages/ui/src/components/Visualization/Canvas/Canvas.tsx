import './Canvas.scss';

import { Catalog, FitToScreen, Network_2 as NetworkIcon, ZoomIn, ZoomOut } from '@carbon/icons-react';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  DRAG_NODE_END_EVENT,
  DRAG_NODE_START_EVENT,
  Model,
  SELECTION_EVENT,
  SelectionEventListener,
  TopologyControlBar,
  TopologyControlButton,
  TopologyView,
  useEventListener,
  useVisualizationController,
  VisualizationSurface,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import {
  FunctionComponent,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { CatalogModalContext } from '../../../dynamic-catalog/catalog-modal.provider';
import { useLocalStorage, useSelectedNodePanIntoView, useSelectedVizNode } from '../../../hooks';
import { useArrowKeyNavigation } from '../../../hooks/use-arrow-key-navigation.hook';
import { LocalStorageKeys } from '../../../models';
import { CanvasLayoutDirection } from '../../../models/settings/settings.model';
import { SettingsContext } from '../../../providers/settings.provider';
import { getInitialLayout } from '../../../utils/get-initial-layout';
import useDeleteHotkey from '../Custom/hooks/delete-hotkey.hook';
import { CanvasOverlayContext, CanvasOverlaySource } from '../Overlay/use-canvas-overlays';
import { applyCollapseState } from './apply-collapse-state';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, LayoutType } from './canvas.models';
import { useCanvasFocusRef } from './canvas-focus';
import { CanvasSideBar } from './CanvasSideBar';
import { consumeNodeSelection } from './node-selection-state';

interface CanvasProps {
  overlaySource?: CanvasOverlaySource;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  isModelResolving?: boolean;
  contextToolbar?: ReactNode;
  applyCollapseOnUpdate?: boolean;
}

const SETTLED_EMPTY_STATE = 'settledEmptyStateVisible';

interface CanvasState {
  [SETTLED_EMPTY_STATE]?: boolean;
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = ({
  nodes,
  edges,
  overlaySource,
  isModelResolving = false,
  contextToolbar,
  applyCollapseOnUpdate = false,
}) => {
  const settingsAdapter = useContext(SettingsContext);
  const settingsLayout = useMemo(
    () => getInitialLayout(settingsAdapter.getSettings().canvasLayoutDirection),
    [settingsAdapter],
  );
  const activeLayout =
    settingsLayout ?? localStorage.getItem(LocalStorageKeys.CanvasLayout) ?? CanvasDefaults.DEFAULT_LAYOUT;

  const controller = useVisualizationController();
  const [initialized, setInitialized] = useState(
    () => controller.hasGraph() && controller.getGraph().getLayout() !== undefined,
  );
  const canvasFocusRef = useCanvasFocusRef(initialized);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(
    LocalStorageKeys.CanvasSidebarWidth,
    CanvasDefaults.DEFAULT_SIDEBAR_WIDTH,
  );

  /** Context to interact with the Canvas catalog */
  const catalogModalContext = useContext(CatalogModalContext);

  const isGraphEmpty = nodes.length === 0 && edges.length === 0;
  const wasGraphEmpty = controller.getState<CanvasState>()[SETTLED_EMPTY_STATE];
  useEffect(() => {
    if (!isModelResolving) {
      controller.setState({ [SETTLED_EMPTY_STATE]: isGraphEmpty });
    }
  }, [controller, isGraphEmpty, isModelResolving]);

  const clearSelection = useCallback(() => {
    const nodeId = selectedIds.length === 1 ? selectedIds[0] : undefined;
    setSelectedIds([]);
    requestAnimationFrame(() => {
      // Step paths repeat across routes; the topology ID includes the owning entity.
      const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      const canvasNode = nodeId
        ? Array.from(
            canvas?.querySelectorAll<HTMLElement>('g.custom-node, g.placeholder-node, g.custom-group') ?? [],
          ).find((node) => node.closest<SVGElement>('[data-id]')?.dataset.id === nodeId)
        : undefined;
      if (canvasNode) {
        canvasNode.focus({ preventScroll: true });
      } else {
        canvas?.focus({ preventScroll: true });
      }
    });
  }, [selectedIds]);

  const selectedVizNode = useSelectedVizNode(selectedIds);
  useDeleteHotkey(selectedVizNode, clearSelection);

  const handleSelection = useCallback<SelectionEventListener>(
    (ids) => {
      setSelectedIds(ids);
      setInitialized(controller.hasGraph() && controller.getGraph().getLayout() !== undefined);
    },
    [controller],
  );
  useEventListener<SelectionEventListener>(SELECTION_EVENT, handleSelection);

  useEffect(() => {
    let pendingFrame: number | undefined;
    const preserveDragFocus = () => {
      const focused = document.activeElement;
      const canvas = document.getElementById(CanvasDefaults.CANVAS_MAIN_ID);
      if (
        !(focused instanceof SVGElement) ||
        !canvas?.contains(focused) ||
        !focused.matches('g.custom-node, g.placeholder-node, g.custom-group')
      )
        return;

      if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
      // PatternFly reorders SVG layers while dragging, which drops DOM focus.
      pendingFrame = requestAnimationFrame(() => {
        // React's layer effects can run after the first animation frame.
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = undefined;
          if (focused.isConnected && document.activeElement === document.body) {
            focused.focus({ preventScroll: true });
          }
        });
      });
    };
    controller.addEventListener(DRAG_NODE_START_EVENT, preserveDragFocus);
    controller.addEventListener(DRAG_NODE_END_EVENT, preserveDragFocus);
    return () => {
      controller.removeEventListener(DRAG_NODE_START_EVENT, preserveDragFocus);
      controller.removeEventListener(DRAG_NODE_END_EVENT, preserveDragFocus);
      if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
    };
  }, [controller]);

  /** Draw graph */
  useEffect(() => {
    if (isModelResolving) {
      return;
    }

    const requestedSelection = consumeNodeSelection(controller, nodes);

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: activeLayout,
      },
    };

    if (!initialized || wasGraphEmpty) {
      controller.fromModel(model, false);
      controller.fireEvent(SELECTION_EVENT, requestedSelection ?? []);

      requestAnimationFrame(() => {
        controller.getGraph().fit(CanvasDefaults.CANVAS_FIT_PADDING);
      });
      return;
    }

    controller.fromModel(model, true);
    if (applyCollapseOnUpdate) {
      applyCollapseState(controller);
    }
    controller.getGraph().layout();
    controller.fireEvent(SELECTION_EVENT, requestedSelection ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, nodes, edges, isModelResolving, applyCollapseOnUpdate]);

  useSelectedNodePanIntoView(selectedIds);

  const controlButtons = useMemo(() => {
    const customButtons: TopologyControlButton[] = [];

    // Only show layout toggle buttons in 'user' mode
    const settings = settingsAdapter.getSettings();
    if (settings.canvasLayoutDirection === CanvasLayoutDirection.SelectInCanvas) {
      customButtons.push(
        {
          id: 'topology-control-bar-h_layout-button',
          icon: <NetworkIcon />,
          tooltip: 'Layout nodes horizontally',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
            controller.getGraph().setLayout(LayoutType.DagreHorizontal);
            controller.getGraph().layout();
          }),
        },
        {
          id: 'topology-control-bar-v_layout-button',
          icon: <NetworkIcon className="canvas-layout-icon-vertical" />,
          tooltip: 'Layout nodes vertically',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreVertical);
            controller.getGraph().setLayout(LayoutType.DagreVertical);
            controller.getGraph().layout();
          }),
        },
      );
    }

    if (catalogModalContext) {
      customButtons.push({
        id: 'topology-control-bar-catalog-button',
        icon: <Catalog />,
        tooltip: 'Open Catalog',
        callback: action(async () => {
          await catalogModalContext.getNewComponent();
        }),
      });
    }

    return createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      fitToScreen: false,
      zoomInIcon: <ZoomIn />,
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutIcon: <ZoomOut />,
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
      resetViewIcon: <FitToScreen />,
      resetViewCallback: action(() => {
        controller.getGraph().reset();
        controller.getGraph().layout();
        controller.getGraph().fit(CanvasDefaults.CANVAS_FIT_PADDING);
      }),
      legend: false,
      customButtons,
    });
  }, [catalogModalContext, controller, settingsAdapter]);

  const restoreNodeFocus = useArrowKeyNavigation(selectedIds.length === 1 ? selectedIds[0] : undefined, nodes);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'rect') {
        setSelectedIds([]);
        requestAnimationFrame(restoreNodeFocus);
      }
    },
    [restoreNodeFocus],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection();
      }
    },
    [clearSelection],
  );

  const isSidebarOpen = useMemo(() => selectedIds.length > 0, [selectedIds.length]);

  /** Move focus to the search bar when the sidebar opens. */
  useEffect(() => {
    if (selectedVizNode) {
      requestAnimationFrame(() => {
        const searchInput = document.querySelector<HTMLElement>('[data-testid="filter-fields"]');
        // preventScroll: the drawer panel is still sliding in from off-screen at this point, so a plain
        // focus() would scroll the drawer's overflow container and make the canvas jump sideways
        searchInput?.focus({ preventScroll: true });
      });
    }
  }, [selectedVizNode]);

  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView
      ref={canvasFocusRef}
      id={CanvasDefaults.CANVAS_MAIN_ID}
      className={clsx({ hidden: !initialized })}
      defaultSideBarSize={sidebarWidth + 'px'}
      minSideBarSize="210px"
      onSideBarResize={setSidebarWidth}
      sideBarResizable
      sideBarOpen={isSidebarOpen}
      sideBar={isSidebarOpen ? <CanvasSideBar vizNode={selectedVizNode} onClose={clearSelection} /> : null}
      contextToolbar={contextToolbar}
      controlBar={<TopologyControlBar controlButtons={controlButtons} />}
      onClick={handleCanvasClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Route canvas"
    >
      <CanvasOverlayContext.Provider
        value={overlaySource?.model.nodes === nodes && overlaySource.model.edges === edges ? overlaySource : undefined}
      >
        <VisualizationSurface state={{ selectedIds }} />
      </CanvasOverlayContext.Provider>
    </TopologyView>
  );
};
