import { Icon } from '@patternfly/react-core';
import { CatalogIcon } from '@patternfly/react-icons';
import {
  Model,
  SELECTION_EVENT,
  SelectionEventListener,
  TopologyControlBar,
  TopologyControlButton,
  TopologyView,
  VisualizationSurface,
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  useEventListener,
  useVisualizationController,
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
import layoutHorizontalIcon from '../../../assets/layout-horizontal.png';
import layoutVerticalIcon from '../../../assets/layout-vertical.png';
import { useLocalStorage } from '../../../hooks';
import { LocalStorageKeys } from '../../../models';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFlowsContext } from '../../../providers/visible-flows.provider';
import { VisualizationEmptyState } from '../EmptyState';
import './Canvas.scss';
import { CanvasSideBar } from './CanvasSideBar';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, LayoutType } from './canvas.models';
import { FlowService } from './flow.service';

interface CanvasProps {
  entities: BaseVisualCamelEntity[];
  contextToolbar?: ReactNode;
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = ({ entities, contextToolbar }) => {
  /** State for @patternfly/react-topology */
  const [initialized, setInitialized] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | undefined>(undefined);
  const [activeLayout, setActiveLayout] = useLocalStorage(LocalStorageKeys.CanvasLayout, CanvasDefaults.DEFAULT_LAYOUT);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(
    LocalStorageKeys.CanvasSidebarWidth,
    CanvasDefaults.DEFAULT_SIDEBAR_WIDTH,
  );

  /** Context to interact with the Canvas catalog */
  const catalogModalContext = useContext(CatalogModalContext);

  const controller = useVisualizationController();
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const shouldShowEmptyState = useMemo(() => {
    const areNoFlows = entities.length === 0;
    const areAllFlowsHidden = Object.values(visibleFlows).every((visible) => !visible);
    return areNoFlows || areAllFlowsHidden;
  }, [entities.length, visibleFlows]);

  /** Draw graph */
  useEffect(() => {
    setSelectedNode(undefined);
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    entities.forEach((entity) => {
      if (visibleFlows[entity.id]) {
        const { nodes: childNodes, edges: childEdges } = FlowService.getFlowDiagram(entity.toVizNode());
        nodes.push(...childNodes);
        edges.push(...childEdges);
      }
    });

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: activeLayout,
      },
    };

    controller.fromModel(model, true);
    setInitialized(true);
  }, [controller, entities, visibleFlows]);

  const handleSelection = useCallback((selectedIds: string[]) => {
    setSelectedIds(selectedIds);
  }, []);
  useEventListener<SelectionEventListener>(SELECTION_EVENT, handleSelection);

  /** Set select node and pan it into view */
  useEffect(() => {
    let resizeTimeout: number | undefined;

    if (!selectedIds[0]) {
      setSelectedNode(undefined);
    } else {
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
    }
  }, [selectedIds, controller]);

  const controlButtons = useMemo(() => {
    const customButtons: TopologyControlButton[] = [
      {
        id: 'topology-control-bar-h_layout-button',
        icon: (
          <Icon>
            <img src={layoutHorizontalIcon} />
          </Icon>
        ),
        tooltip: 'Horizontal Layout',
        callback: action(() => {
          setActiveLayout(LayoutType.DagreHorizontal);
          controller.getGraph().setLayout(LayoutType.DagreHorizontal);
          controller.getGraph().layout();
        }),
      },
      {
        id: 'topology-control-bar-v_layout-button',
        icon: (
          <Icon>
            <img src={layoutVerticalIcon} />
          </Icon>
        ),
        tooltip: 'Vertical Layout',
        callback: action(() => {
          setActiveLayout(LayoutType.DagreVertical);
          controller.getGraph().setLayout(LayoutType.DagreVertical);
          controller.getGraph().layout();
        }),
      },
    ];
    if (catalogModalContext) {
      customButtons.push({
        id: 'topology-control-bar-catalog-button',
        icon: <CatalogIcon />,
        tooltip: 'Open Catalog',
        callback: action(() => {
          catalogModalContext.setIsModalOpen(true);
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
      }),
      legend: false,
      customButtons,
    });
  }, [catalogModalContext, controller, setActiveLayout]);

  const handleCloseSideBar = useCallback(() => {
    setSelectedIds([]);
    setSelectedNode(undefined);
  }, []);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'rect') {
        handleCloseSideBar();
      }
    },
    [handleCloseSideBar],
  );

  const isSidebarOpen = useMemo(() => selectedNode !== undefined, [selectedNode]);

  return (
    <TopologyView
      className={clsx({ hidden: !initialized })}
      defaultSideBarSize={sidebarWidth + 'px'}
      minSideBarSize="210px"
      onSideBarResize={setSidebarWidth}
      sideBarResizable
      sideBarOpen={isSidebarOpen}
      sideBar={<CanvasSideBar selectedNode={selectedNode} onClose={handleCloseSideBar} />}
      contextToolbar={contextToolbar}
      controlBar={<TopologyControlBar controlButtons={controlButtons} />}
      onClick={handleCanvasClick}
    >
      <VisualizationSurface state={{ selectedIds }} />

      {shouldShowEmptyState && (
        <VisualizationEmptyState
          className="canvas-empty-state"
          data-testid="visualization-empty-state"
          entitiesNumber={entities.length}
        />
      )}
    </TopologyView>
  );
};
