import './HiddenCanvas.scss';

import {
  action,
  GRAPH_LAYOUT_END_EVENT,
  Model,
  useEventListener,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { toBlob } from 'html-to-image';
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
  const controllerRef = useRef<ReturnType<typeof ControllerService.createController>>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onCompleteRef up to date
  onCompleteRef.current = onComplete;

  controllerRef.current ??= ControllerService.createController();
  const controller = controllerRef.current;

  useEventListener(GRAPH_LAYOUT_END_EVENT, () => {
    if (!hasExportedRef.current) {
      setLayoutComplete(true);
    }
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

    const rafId = requestAnimationFrame(() => {
      action(() => {
        const graph = controller.getGraph();
        graph.reset();
        graph.fit(0);
        graph.layout();
      })();
    });

    const fallbackTimer = setTimeout(() => {
      if (!hasExportedRef.current) {
        setLayoutComplete(true);
      }
    }, 1_000);

    return () => {
      clearTimeout(fallbackTimer);
      cancelAnimationFrame(rafId);
    };
  }, [controller, entities, layout, visibleFlows]);

  useEffect(() => {
    if (!layoutComplete || !containerRef.current || hasExportedRef.current) return;

    hasExportedRef.current = true;
    let isMounted = true;

    const exportCanvas = async () => {
      try {
        const surface = containerRef.current?.querySelector('.pf-topology-visualization-surface') as HTMLElement;

        if (!surface) {
          console.error('Surface not found');
          if (isMounted) onCompleteRef.current();
          return;
        }

        const svg = surface.querySelector('svg') as SVGSVGElement;
        if (svg) {
          const bbox = svg.getBBox();
          const padding = 20;
          const width = Math.ceil(bbox.width + padding * 2);
          const height = Math.ceil(bbox.height + padding * 2);

          svg.setAttribute('width', String(width));
          svg.setAttribute('height', String(height));
          svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
        }

        const blob = await toBlob(surface, {
          cacheBust: true,
          filter: (node: HTMLElement) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
          pixelRatio: 2,
          skipFonts: true,
          skipAutoScale: true,
        });

        if (!blob) {
          console.error('Failed to generate blob');
          if (isMounted) onCompleteRef.current();
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'kaoto-flow.png';
        link.click();

        // Clean up the blob URL after a short delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch (err) {
        console.error('Export failed', err);
      } finally {
        if (isMounted) onCompleteRef.current();
      }
    };

    exportCanvas();

    return () => {
      isMounted = false;
    };
  }, [layoutComplete]);

  return (
    <div ref={containerRef} className="hidden-canvas">
      <VisualizationProvider controller={controllerRef.current}>
        <VisualizationSurface state={{}} />
      </VisualizationProvider>
    </div>
  );
};
