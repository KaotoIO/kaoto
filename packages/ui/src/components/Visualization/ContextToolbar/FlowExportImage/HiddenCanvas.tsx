import { action, Model, VisualizationProvider, VisualizationSurface } from '@patternfly/react-topology';
import { FunctionComponent, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { BaseVisualCamelEntity } from '../../../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { CanvasEdge, CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';

interface HiddenCanvasProps {
  entities: BaseVisualCamelEntity[];
  layout: LayoutType;
  onReady: (element: HTMLElement) => void;
}

export const HiddenCanvas: FunctionComponent<HiddenCanvasProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const { visibleFlows } = useContext(VisibleFlowsContext)!;

  const hiddenController = useMemo(() => {
    const controller = ControllerService.createController();

    try {
      const nodes: CanvasNode[] = [];
      const edges: CanvasEdge[] = [];

      props.entities.forEach((entity) => {
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
          layout: props.layout,
        },
      };

      controller.fromModel(model, false);
      setTimeout(() => setModelLoaded(true), 0);
    } catch (error) {
      console.error('Failed to prepare hidden controller:', error);
    }

    return controller;
  }, [props.entities, props.layout, visibleFlows]);

  useEffect(() => {
    if (!modelLoaded || !containerRef.current) return;

    const exportCanvas = async () => {
      try {
        const hiddenGraph = hiddenController.getGraph();

        if (!hiddenGraph) {
          console.error('Hidden graph not available');
          return;
        }

        action(() => {
          hiddenGraph.reset();
          hiddenGraph.fit(10);
          hiddenGraph.layout();
        })();

        let attempts = 0;
        const maxAttempts = 40;

        const waitForLayout = () =>
          new Promise<void>((resolve) => {
            const checkLayout = () => {
              if (!containerRef.current) {
                resolve();
                return;
              }

              const svg = containerRef.current.querySelector('svg') as SVGSVGElement;
              const nodes = svg?.querySelectorAll('[data-kind="node"]');

              if (nodes && nodes.length > 0) {
                const firstNode = nodes[0] as SVGGElement;
                const transform = firstNode.getAttribute('transform');

                if (transform && transform !== 'translate(0, 0)') {
                  resolve();
                  return;
                }
              }

              attempts++;
              if (attempts >= maxAttempts) {
                resolve();
                return;
              }

              setTimeout(checkLayout, 50);
            };

            checkLayout();
          });

        await waitForLayout();

        if (!containerRef.current) return;

        const surface = containerRef.current.querySelector('.pf-topology-visualization-surface') as HTMLElement;

        if (surface) {
          const svg = surface.querySelector('svg') as SVGSVGElement;

          if (svg) {
            const bbox = svg.getBBox();
            const padding = 10;
            const width = Math.ceil(bbox.width + padding * 2);
            const height = Math.ceil(bbox.height + padding * 2);

            svg.setAttribute('width', String(width));
            svg.setAttribute('height', String(height));
            svg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
          }

          props.onReady(surface);
        } else {
          console.error('Surface not found');
        }
      } catch (error) {
        console.error('Export failed:', error);
      }
    };

    exportCanvas();
  }, [modelLoaded, hiddenController, props]);

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
      <VisualizationProvider controller={hiddenController}>
        {modelLoaded && <VisualizationSurface state={{}} />}
      </VisualizationProvider>
    </div>
  );
};
