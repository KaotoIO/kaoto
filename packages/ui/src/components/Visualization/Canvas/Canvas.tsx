import { CatalogIcon } from '@patternfly/react-icons';
import {
  GRAPH_LAYOUT_END_EVENT,
  Model,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  VisualizationProvider,
  VisualizationSurface,
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
} from '@patternfly/react-topology';
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
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { VisibleFlowsContext } from '../../../providers/visible-flows.provider';
import { CanvasSideBar } from './CanvasSideBar';
import { CanvasEdge, CanvasNode } from './canvas.models';
import { CanvasService } from './canvas.service';

interface CanvasProps {
  contextToolbar?: ReactNode;
  entities: BaseVisualCamelEntity[];
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  /** State for @patternfly/react-topology */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | undefined>(undefined);

  /** Context to interact with the Canvas catalog */
  const catalogModalContext = useContext(CatalogModalContext);

  const controller = useMemo(() => CanvasService.createController(), []);
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const controlButtons = useMemo(() => {
    return createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
      fitToScreenCallback: action(() => {
        controller.getGraph().fit(80);
      }),
      resetViewCallback: action(() => {
        controller.getGraph().reset();
        controller.getGraph().layout();
      }),
      legend: false,
      customButtons: [
        {
          id: 'topology-control-bar-catalog-button',
          icon: <CatalogIcon />,
          callback: () => {
            catalogModalContext?.setIsModalOpen(true);
          },
        },
      ],
    });
  }, [catalogModalContext, controller]);

  const handleSelection = useCallback((selectedIds: string[]) => {
    setSelectedIds(selectedIds);

    /** Current support for single selection at the moment */
    const selectedId = selectedIds[0];
    setSelectedNode(CanvasService.nodes.find((node) => node.id === selectedId));
  }, []);

  /** Set up the controller one time */
  useEffect(() => {
    const localController = controller;
    const graphLayoutEndFn = () => {
      localController.getGraph().fit(80);
    };
    localController.addEventListener(SELECTION_EVENT, handleSelection);
    localController.addEventListener(GRAPH_LAYOUT_END_EVENT, graphLayoutEndFn);
    return () => {
      localController.removeEventListener(SELECTION_EVENT, handleSelection);
      localController.removeEventListener(GRAPH_LAYOUT_END_EVENT, graphLayoutEndFn);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Draw graph */
  useEffect(() => {
    if (!Array.isArray(props.entities)) return;

    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    props.entities.forEach((entity) => {
      if (visibleFlows[entity.id]) {
        const { nodes: childNodes, edges: childEdges } = CanvasService.getFlowDiagram(entity.toVizNode());
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
        layout: CanvasService.DEFAULT_LAYOUT,
      },
    };

    controller.fromModel(model, false);
  }, [controller, props.entities, visibleFlows]);

  const handleCloseSideBar = useCallback(() => {
    setSelectedIds([]);
    setSelectedNode(undefined);
  }, []);

  return (
    <TopologyView
      sideBar={<CanvasSideBar selectedNode={selectedNode} onClose={handleCloseSideBar} />}
      contextToolbar={props.contextToolbar}
      controlBar={<TopologyControlBar controlButtons={controlButtons} />}
    >
      <VisualizationProvider controller={controller}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};
