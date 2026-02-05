import './SourceTargetView.scss';

import { Split, SplitItem } from '@patternfly/react-core';
import { CSSProperties, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { MappingLinksContainer } from './MappingLinkContainer';
import { SourcePanel } from './SourcePanel';
import { TargetPanel } from './TargetPanel';

interface SourceTargetViewProps {
  uiScaleFactor?: number; // Optional scale factor, defaults to 1 (full size)
}

export const SourceTargetView: FunctionComponent<SourceTargetViewProps> = ({
  uiScaleFactor: initialScaleFactor = 1,
}) => {
  const { reloadNodeReferences, setDefaultHandler } = useCanvas();
  const { mappingLinkCanvasRef } = useMappingLinks();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(initialScaleFactor);

  useEffect(() => {
    setDefaultHandler(new SourceTargetDnDHandler());
  }, [setDefaultHandler]);

  const handleZoomIn = useCallback(() => {
    setScaleFactor((prev) => Math.min(prev + 0.1, 1.2)); // Max 1.2x zoom
  }, []);

  const handleZoomOut = useCallback(() => {
    setScaleFactor((prev) => Math.max(prev - 0.1, 0.7)); // Min 0.7x zoom
  }, []);

  // Reload node references when scale factor changes to update mapping lines
  useEffect(() => {
    // Give the browser time to apply the CSS changes before recalculating positions
    const timeoutId = setTimeout(() => {
      reloadNodeReferences();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [scaleFactor, reloadNodeReferences]);

  // Apply scale factor dynamically
  const customStyles: CSSProperties = {
    '--datamapper-scale-factor': scaleFactor,
  } as CSSProperties;

  return (
    <Split className="source-target-view" onScroll={reloadNodeReferences} style={customStyles} ref={containerRef}>
      <SplitItem className="source-target-view__source-split" isFilled>
        <SourcePanel onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </SplitItem>

      <SplitItem className="source-target-view__line-blank">
        <div ref={mappingLinkCanvasRef} />
      </SplitItem>

      <SplitItem className="source-target-view__target-split" isFilled>
        <TargetPanel />
      </SplitItem>

      <MappingLinksContainer />
    </Split>
  );
};
