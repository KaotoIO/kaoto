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
import { FunctionComponent, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { buildDesignerCanvasModel } from '../../designer-canvas-model';

interface HiddenCanvasProps {
  vizNodes: IVisualizationNode[];
  layout?: LayoutType;
  autoDownload?: boolean;
  onComplete: () => void;
  onBlobGenerated?: (blob: Blob) => void;
}

export const HiddenCanvas: FunctionComponent<HiddenCanvasProps> = ({
  vizNodes,
  layout = LayoutType.DagreHorizontal,
  onComplete,
  onBlobGenerated,
  autoDownload = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutComplete, setLayoutComplete] = useState(false);
  const hasExportedRef = useRef(false);
  const [controller] = useState(() => ControllerService.createController());
  const onCompleteRef = useRef(onComplete);
  const onBlobGeneratedRef = useRef(onBlobGenerated);

  // Keep the callback refs up to date, so a re-render of the parent doesn't restart the export
  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
    onBlobGeneratedRef.current = onBlobGenerated;
  }, [onComplete, onBlobGenerated]);

  useEventListener(GRAPH_LAYOUT_END_EVENT, () => {
    if (!hasExportedRef.current) {
      setLayoutComplete(true);
    }
  });

  useEffect(() => {
    /* The routes, and the links from their agents to their tools, without the placeholders */
    const { nodes, edges } = buildDesignerCanvasModel(vizNodes, { removePlaceholder: true });

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
  }, [controller, layout, vizNodes]);

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
          skipAutoScale: true,
        });

        if (!blob) {
          console.error('Failed to generate blob');
          if (isMounted) onCompleteRef.current();
          return;
        }

        // The canvas may be gone by the time the image is ready; don't hand the blob to a parent that removed it
        if (isMounted) onBlobGeneratedRef.current?.(blob);

        // Only auto-download if enabled
        if (autoDownload) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'kaoto-flow.png';
          link.click();

          // Clean up the blob URL after a short delay to ensure download starts
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
        }
      } catch (err) {
        console.error('Export failed', err);
      } finally {
        if (isMounted) onCompleteRef.current();
      }
    };

    void exportCanvas();

    return () => {
      isMounted = false;
    };
  }, [layoutComplete, autoDownload]);

  return (
    <div ref={containerRef} className="hidden-canvas" data-testid="hidden-canvas">
      <VisualizationProvider controller={controller}>
        <VisualizationSurface state={{}} />
      </VisualizationProvider>
    </div>
  );
};
