import {
  EdgeModel,
  GRAPH_LAYOUT_END_EVENT,
  Model,
  NodeModel,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologyView,
  VisualizationProvider,
  VisualizationSurface,
  action,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
} from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { CamelRoute } from '../../camel-entities';
import { CanvasService, LayoutType } from './canvas.service';

interface CanvasProps {
  contextToolbar?: React.ReactNode;
  entities: CamelRoute[];
}

export const VisualizationCanvas: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const controller = useMemo(() => {
    const newController = CanvasService.createController();
    newController.addEventListener(SELECTION_EVENT, setSelectedIds);
    newController.addEventListener(GRAPH_LAYOUT_END_EVENT, () =>
      /** TODO: Schedule the layouting in a better fashion */
      setTimeout(() => {
        newController.getGraph().fit(80);
      }, 100),
    );
    return newController;
  }, []);

  /** Draw graph */
  useEffect(() => {
    if (!Array.isArray(props.entities)) return;

    const nodes: NodeModel[] = [];
    const edges: EdgeModel[] = [];

    props.entities.forEach((entity) => {
      const { nodes: childNodes, edges: childEdges } = CanvasService.getNodesAndEdges(entity);
      nodes.push(...childNodes);
      edges.push(...childEdges);
    });

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: LayoutType.Dagre,
      },
    };

    controller.fromModel(model, false);
  }, [controller, props.entities]);

  return (
    <TopologyView
      contextToolbar={props.contextToolbar}
      controlBar={
        <TopologyControlBar
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: action(() => {
              controller.getGraph().scaleBy(4 / 3);
            }),
            zoomOutCallback: action(() => {
              controller.getGraph().scaleBy(0.75);
            }),
            fitToScreenCallback: action(() => {
              controller.getGraph().fit(80);
            }),
            resetViewCallback: action(() => {
              controller.getGraph().reset();
              controller.getGraph().layout();
            }),
            legend: false,
          })}
        />
      }
    >
      <VisualizationProvider controller={controller}>
        <VisualizationSurface state={{ selectedIds }} />
      </VisualizationProvider>
    </TopologyView>
  );
};
