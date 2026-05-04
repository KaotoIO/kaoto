import './Canvas.scss';

import { CatalogIcon } from '@patternfly/react-icons';
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
  useState,
} from 'react';

import { CatalogModalContext } from '../../../dynamic-catalog/catalog-modal.provider';
import { useLocalStorage } from '../../../hooks';
import { usePrevious } from '../../../hooks/previous.hook';
import { LocalStorageKeys } from '../../../models';
import { CanvasLayoutDirection } from '../../../models/settings/settings.model';
import { SettingsContext } from '../../../providers/settings.provider';
import { getInitialLayout } from '../../../utils/get-initial-layout';
import { HorizontalLayoutIcon } from '../../Icons/HorizontalLayout';
import { VerticalLayoutIcon } from '../../Icons/VerticalLayout';
import useDeleteHotkey from '../Custom/hooks/delete-hotkey.hook';
import { VisualizationEmptyState } from '../EmptyState';
import { applyCollapseState } from './apply-collapse-state';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, LayoutType } from './canvas.models';
import { CanvasSideBar } from './CanvasSideBar';

interface CanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  entitiesCount: number;
  visibleEntitiesCount: number;
  isModelResolving?: boolean;
  contextToolbar?: ReactNode;
  applyCollapseOnUpdate?: boolean;
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = ({
  nodes,
  edges,
  entitiesCount,
  visibleEntitiesCount,
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

  const [initialized, setInitialized] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | undefined>(undefined);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(
    LocalStorageKeys.CanvasSidebarWidth,
    CanvasDefaults.DEFAULT_SIDEBAR_WIDTH,
  );

  /** Context to interact with the Canvas catalog */
  const catalogModalContext = useContext(CatalogModalContext);

  const controller = useVisualizationController();
  const shouldShowEmptyState = useMemo(() => {
    const areNoFlows = entitiesCount === 0;
    const areAllFlowsHidden = visibleEntitiesCount === 0 && entitiesCount > 0;
    return areNoFlows || areAllFlowsHidden;
  }, [entitiesCount, visibleEntitiesCount]);

  const wasEmptyStateVisible = usePrevious(shouldShowEmptyState);
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedNode(undefined);
  }, []);

  useDeleteHotkey(selectedNode?.data?.vizNode, clearSelection);

  /** Draw graph */
  useEffect(() => {
    clearSelection();

    if (isModelResolving) {
      return;
    }

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: activeLayout,
      },
    };

    if (!initialized || wasEmptyStateVisible) {
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

  /** Set select node and pan it into view */
  useEffect(() => {
    let resizeTimeout: number | undefined;

    if (selectedIds[0]) {
      const selectedNode = controller.getNodeById(selectedIds[0]);
      if (selectedNode) {
        setSelectedNode(selectedNode as unknown as CanvasNode);
        resizeTimeout = setTimeout(
          action(() => {
            controller.getGraph().panIntoView(selectedNode, { offset: 20, minimumVisible: 100 });
            resizeTimeout = undefined;
          }),
          500,
        ) as unknown as number;
      }
      return () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
      };
    } else {
      setSelectedNode(undefined);
    }
  }, [selectedIds, controller]);

  const controlButtons = useMemo(() => {
    const customButtons: TopologyControlButton[] = [];

    // Only show layout toggle buttons in 'user' mode
    const settings = settingsAdapter.getSettings();
    if (settings.canvasLayoutDirection === CanvasLayoutDirection.SelectInCanvas) {
      customButtons.push(
        {
          id: 'topology-control-bar-h_layout-button',
          icon: <HorizontalLayoutIcon />,
          tooltip: 'Horizontal Layout',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
            controller.getGraph().setLayout(LayoutType.DagreHorizontal);
            controller.getGraph().layout();
          }),
        },
        {
          id: 'topology-control-bar-v_layout-button',
          icon: <VerticalLayoutIcon />,
          tooltip: 'Vertical Layout',
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
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
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

  const isSidebarOpen = useMemo(() => selectedIds.length > 0, [selectedIds.length]);

  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView
      className={clsx({ hidden: !initialized })}
      defaultSideBarSize={sidebarWidth + 'px'}
      minSideBarSize="210px"
      onSideBarResize={setSidebarWidth}
      sideBarResizable
      sideBarOpen={isSidebarOpen}
      sideBar={isSidebarOpen ? <CanvasSideBar selectedNode={selectedNode} onClose={clearSelection} /> : null}
      contextToolbar={contextToolbar}
      controlBar={<TopologyControlBar controlButtons={controlButtons} />}
      onClick={handleCanvasClick}
    >
      <VisualizationSurface state={{ selectedIds }} />

      {shouldShowEmptyState && (
        <VisualizationEmptyState
          className="canvas-empty-state"
          data-testid="visualization-empty-state"
          entitiesNumber={entitiesCount}
        />
      )}
    </TopologyView>
  );
};
