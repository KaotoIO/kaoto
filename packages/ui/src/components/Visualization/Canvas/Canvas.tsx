import './Canvas.scss';

import { CatalogIcon, ExpandIcon, SearchMinusIcon, SearchPlusIcon } from '@patternfly/react-icons';
import {
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
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
  useRef,
  useState,
} from 'react';

import { CatalogModalContext } from '../../../dynamic-catalog/catalog-modal.provider';
import { useLocalStorage, useSelectedNodePanIntoView, useSelectedVizNode } from '../../../hooks';
import { useArrowKeyNavigation } from '../../../hooks/use-arrow-key-navigation.hook';
import { LocalStorageKeys } from '../../../models';
import { CanvasLayoutDirection } from '../../../models/settings/settings.model';
import { SettingsContext } from '../../../providers/settings.provider';
import { getInitialLayout } from '../../../utils/get-initial-layout';
import { HorizontalLayoutIcon } from '../../Icons/HorizontalLayout';
import { VerticalLayoutIcon } from '../../Icons/VerticalLayout';
import useDeleteHotkey from '../Custom/hooks/delete-hotkey.hook';
import { CanvasOverlayContext, CanvasOverlaySource } from '../Overlay/use-canvas-overlays';
import { applyCollapseState } from './apply-collapse-state';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, LayoutType } from './canvas.models';
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

  /** Track which viz-node id was selected so focus can return to it on sidebar close */
  const selectedVizNodeIdRef = useRef<string | undefined>(undefined);

  const clearSelection = useCallback(() => {
    const vizNodeId = selectedVizNodeIdRef.current;
    setSelectedIds([]);
    requestAnimationFrame(() => {
      // Prefer restoring focus to the canvas node that was selected (matches any type: custom-node, placeholder-node, custom-group)
      const canvasNode = vizNodeId ? document.querySelector<HTMLElement>(`[data-testid$="__${vizNodeId}"]`) : null;
      if (canvasNode) {
        canvasNode.focus({ preventScroll: true });
      } else {
        document.getElementById(CanvasDefaults.CANVAS_MAIN_ID)?.focus({ preventScroll: true });
      }
    });
  }, []);

  const selectedVizNode = useSelectedVizNode(selectedIds);
  useDeleteHotkey(selectedVizNode, clearSelection);

  /** Draw graph */
  useEffect(() => {
    if (isModelResolving) {
      return;
    }

    const requestedSelection = consumeNodeSelection(controller, nodes);
    setSelectedIds(requestedSelection ?? []);

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
      setInitialized(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, nodes, edges, isModelResolving, applyCollapseOnUpdate]);

  useEventListener<SelectionEventListener>(SELECTION_EVENT, setSelectedIds);
  useSelectedNodePanIntoView(selectedIds);

  const controlButtons = useMemo(() => {
    const customButtons: TopologyControlButton[] = [];

    // Only show layout toggle buttons in 'user' mode
    const settings = settingsAdapter.getSettings();
    if (settings.canvasLayoutDirection === CanvasLayoutDirection.SelectInCanvas) {
      customButtons.push(
        {
          id: 'topology-control-bar-h_layout-button',
          icon: <HorizontalLayoutIcon />,
          tooltip: 'Layout nodes horizontally',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
            controller.getGraph().setLayout(LayoutType.DagreHorizontal);
            controller.getGraph().layout();
          }),
        },
        {
          id: 'topology-control-bar-v_layout-button',
          icon: <VerticalLayoutIcon />,
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
        icon: <CatalogIcon />,
        tooltip: 'Open Catalog',
        callback: action(async () => {
          await catalogModalContext.getNewComponent();
        }),
      });
    }

    return createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      fitToScreen: false,
      zoomInIcon: <SearchPlusIcon />,
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutIcon: <SearchMinusIcon />,
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
      resetViewIcon: <ExpandIcon />,
      resetViewCallback: action(() => {
        controller.getGraph().reset();
        controller.getGraph().layout();
        controller.getGraph().fit(CanvasDefaults.CANVAS_FIT_PADDING);
      }),
      legend: false,
      customButtons,
    });
  }, [catalogModalContext, controller, settingsAdapter]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'rect') {
        clearSelection();
      }
    },
    [clearSelection],
  );

  useArrowKeyNavigation();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearSelection();
      }
    },
    [clearSelection],
  );

  const isSidebarOpen = useMemo(() => selectedIds.length > 0, [selectedIds.length]);

  /** Track the selected node id and move focus to the search bar when sidebar opens */
  useEffect(() => {
    if (selectedVizNode) {
      selectedVizNodeIdRef.current = selectedVizNode.id;
      requestAnimationFrame(() => {
        const searchInput = document.querySelector<HTMLElement>('[data-testid="filter-fields"] input');
        // preventScroll: the drawer panel is still sliding in from off-screen at this point, so a plain
        // focus() would scroll the drawer's overflow container and make the canvas jump sideways
        searchInput?.focus({ preventScroll: true });
      });
    } else {
      selectedVizNodeIdRef.current = undefined;
    }
  }, [selectedVizNode]);

  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView
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
