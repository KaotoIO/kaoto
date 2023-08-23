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
import { FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { Flow } from '../../flows';
import './Canvas.scss';
import { CanvasService, LayoutType } from './canvas.service';

interface CanvasProps {
  className?: string;
  flows: Flow[];
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const controller = useMemo(() => {
    const newController = CanvasService.createController();
    newController.addEventListener(SELECTION_EVENT, setSelectedIds);
    /** TODO: Schedule the layouting in a better fashion */
    newController.addEventListener(GRAPH_LAYOUT_END_EVENT, () =>
      setTimeout(() => {
        newController.getGraph().fit(80);
      }, 100),
    );
    return newController;
  }, []);

  /** Draw graph */
  useEffect(() => {
    if (props.flows.length === 0) return;

    const { nodes, edges } = CanvasService.getNodesAndEdges(props.flows[0]);

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
  }, [controller, props.flows]);

  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <TopologyView
        className="canvasSurface__graph"
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
    </div>
  );
};
