import {
  action,
  GRAPH_LAYOUT_END_EVENT,
  Model,
  useEventListener,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { toPng } from 'html-to-image';
import { FunctionComponent, useContext, useEffect, useRef, useState } from 'react';

import { BaseVisualCamelEntity } from '../../../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { CanvasEdge, CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';

interface HiddenCanvasProps {
  entities: BaseVisualCamelEntity[];
  layout?: LayoutType;
  onComplete: () => void;
}

export const HiddenCanvas: FunctionComponent<HiddenCanvasProps> = ({
  entities,
  layout = LayoutType.DagreHorizontal,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutComplete, setLayoutComplete] = useState(false);
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const hasExportedRef = useRef(false);
  const controllerRef = useRef<ReturnType<typeof ControllerService.createController>>();

  if (!controllerRef.current) {
    controllerRef.current = ControllerService.createController();
  }
  const controller = controllerRef.current;

  useEventListener(GRAPH_LAYOUT_END_EVENT, () => {
    setTimeout(() => {
      if (!hasExportedRef.current) {
        setLayoutComplete(true);
      }
    }, 300);
  });

  useEffect(() => {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    entities.forEach((entity) => {
      if (visibleFlows[entity.id]) {
        const { nodes: childNodes, edges: childEdges } = FlowService.getFlowDiagram(entity.id, entity.toVizNode());
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
        layout,
      },
    };

    controller.fromModel(model, false);

    requestAnimationFrame(() => {
      action(() => {
        const graph = controller.getGraph();
        graph.reset();
        graph.fit(80);
        graph.layout();
      })();
    });

    const fallbackTimer = setTimeout(() => {
      if (!hasExportedRef.current) {
        setLayoutComplete(true);
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [controller, entities, layout, visibleFlows]);

  useEffect(() => {
    if (!layoutComplete || !containerRef.current || hasExportedRef.current) return;

    hasExportedRef.current = true;

    const exportCanvas = async () => {
      try {
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const surface = containerRef.current?.querySelector('.pf-topology-visualization-surface') as HTMLElement;

        if (!surface) {
          console.error('Surface not found');
          onComplete();
          return;
        }

        const svg = surface.querySelector('svg') as SVGSVGElement;
        if (svg) {
          const bbox = svg.getBBox();
          const padding = 100;
          const width = Math.ceil(bbox.width + padding * 2);
          const height = Math.ceil(bbox.height + padding * 2);

          svg.setAttribute('width', String(width));
          svg.setAttribute('height', String(height));
          svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
        }

        const dataUrl = await toPng(surface, {
          cacheBust: false,
          backgroundColor: '#f0f0f0',
          filter: (node: HTMLElement) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
          pixelRatio: 2,
        });

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'kaoto-flow.png';
        link.click();

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        console.error('Export failed', err);
      } finally {
        onComplete();
      }
    };

    exportCanvas();
  }, [layoutComplete, onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        opacity: 0,
        zIndex: -1,
      }}
    >
      <VisualizationProvider controller={controllerRef.current}>
        <VisualizationSurface state={{}} />
      </VisualizationProvider>
    </div>
  );
};
