import { FunctionComponent, Ref, useContext, useEffect, useEffectEvent, useImperativeHandle, useState } from 'react';

import { ExportDocumentPreviewModal } from '../../components/Visualization/ContextToolbar/ExportDocument/ExportDocumentPreviewModal';
import { HiddenCanvas } from '../../components/Visualization/ContextToolbar/FlowExportImage/HiddenCanvas';
import { useGraphLayout } from '../../components/Visualization/Custom/hooks/use-graph-layout.hook';
import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { EntitiesContext, VisibleFlowsContext } from '../../providers';

/** What the host of the canvas can do with the routes on it, from its own toolbar */
export interface RouteVisualizationHandle {
  /** Downloads the visible flows as `kaoto-flow.png`, laid out as on the canvas. Does nothing without visible flows. */
  exportImage(): void;
  /** Opens the route documentation preview, from which the documentation is downloaded */
  openDocumentation(): void;
}

/** Tells the host whether its tools for the canvas can be used */
export interface RouteVisualizationToolsState {
  /** There are visible flows to export */
  canExport: boolean;
  /** An image export is running */
  isExportingImage: boolean;
}

interface RouteVisualizationToolsProps {
  ref?: Ref<RouteVisualizationHandle>;
  onStateChange?: (state: RouteVisualizationToolsState) => void;
}

/** Draws the visible flows on a hidden canvas and downloads them, once they are resolved */
const ImageExport: FunctionComponent<{ onComplete: () => void }> = ({ onComplete }) => {
  const visualEntities = useContext(EntitiesContext)?.visualEntities ?? [];
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const { vizNodes, isResolving } = useVisibleVizNodes(visualEntities, visibleFlows);
  const layout = useGraphLayout();

  if (isResolving) return null;
  return <HiddenCanvas autoDownload vizNodes={vizNodes} layout={layout} onComplete={onComplete} />;
};

/**
 * The tools of the canvas that a host offers in its own toolbar: exporting the flows as an image and the route
 * documentation. It renders inside the providers of the canvas, which the tools need, and hands them to the host
 * through `ref`.
 */
export const RouteVisualizationTools: FunctionComponent<RouteVisualizationToolsProps> = ({ ref, onStateChange }) => {
  const visualEntities = useContext(EntitiesContext)?.visualEntities ?? [];
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isDocumentationOpen, setIsDocumentationOpen] = useState(false);

  const canExport = visualEntities.some((entity) => visibleFlows[entity.id]);

  useImperativeHandle(
    ref,
    () => ({
      exportImage: () => {
        if (canExport) setIsExportingImage(true);
      },
      openDocumentation: () => {
        setIsDocumentationOpen(true);
      },
    }),
    [canExport],
  );

  // The host's callback may change on every render; only a change of the state is reported
  const reportState = useEffectEvent((state: RouteVisualizationToolsState) => {
    onStateChange?.(state);
  });
  useEffect(() => {
    reportState({ canExport, isExportingImage });
  }, [canExport, isExportingImage]);

  return (
    <>
      {isExportingImage && (
        <ImageExport
          onComplete={() => {
            setIsExportingImage(false);
          }}
        />
      )}
      {isDocumentationOpen && (
        <ExportDocumentPreviewModal
          onClose={() => {
            setIsDocumentationOpen(false);
          }}
        />
      )}
    </>
  );
};
