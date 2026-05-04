import './SourceTargetView.scss';

import { Button, Split, SplitItem } from '@patternfly/react-core';
import { SearchMinusIcon, SearchPlusIcon } from '@patternfly/react-icons';
import { CSSProperties, FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';

import { useConnectionPortSync } from '../../hooks';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { useResizeObserver } from '../../hooks/useResizeObserver.hook';
import { DocumentNodeData, TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { MappingLinksContainer } from './MappingLinkContainer';
import { SourcePanel } from './SourcePanel';
import { TargetPanel } from './TargetPanel';

interface SourceTargetViewProps {
  uiScaleFactor?: number; // Optional scale factor, defaults to 1 (full size)
}

export const SourceTargetView: FunctionComponent<SourceTargetViewProps> = ({
  uiScaleFactor: initialScaleFactor = 1,
}) => {
  const { mappingLinkCanvasRef } = useMappingLinks();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(initialScaleFactor);

  const { sourceBodyDocument, targetBodyDocument, mappingTree, sourceParameterMap } = useDataMapper();

  const sourceBodyNodeData = useMemo(() => new DocumentNodeData(sourceBodyDocument), [sourceBodyDocument]);
  const targetBodyNodeData = useMemo(
    () => new TargetDocumentNodeData(targetBodyDocument, mappingTree),
    [targetBodyDocument, mappingTree],
  );
  const sourceParamNodeDataArray = useMemo(() => {
    return Array.from(sourceParameterMap.values()).map((doc) => new DocumentNodeData(doc));
  }, [sourceParameterMap]);

  const allSyncIds = useMemo(() => {
    const paramIds = sourceParamNodeDataArray.map((node) => node.id);
    return [sourceBodyNodeData.id, targetBodyNodeData.id, ...paramIds];
  }, [sourceBodyNodeData.id, targetBodyNodeData.id, sourceParamNodeDataArray]);

  const { syncConnectionPorts: syncAllConnectionPorts } = useConnectionPortSync(allSyncIds);

  const onViewResize = useCallback(() => {
    syncAllConnectionPorts();
  }, [syncAllConnectionPorts]);

  useResizeObserver(containerRef, onViewResize);

  const handleZoomIn = useCallback(() => {
    setScaleFactor((prev) => Math.min(prev + 0.1, 1.2)); // Max 1.2x zoom
  }, []);

  const handleZoomOut = useCallback(() => {
    setScaleFactor((prev) => Math.max(prev - 0.1, 0.7)); // Min 0.7x zoom
  }, []);

  // Create action items for DataMapper header (zoom controls, and potentially debugger in the future)
  const datamapperActionItems = useMemo(
    () => [
      <Button
        key="zoom-in"
        variant="plain"
        icon={<SearchPlusIcon />}
        onClick={(e) => {
          e.stopPropagation();
          handleZoomIn();
        }}
        aria-label="Zoom in"
        title="Zoom in"
      />,
      <Button
        key="zoom-out"
        variant="plain"
        icon={<SearchMinusIcon />}
        onClick={(e) => {
          e.stopPropagation();
          handleZoomOut();
        }}
        aria-label="Zoom out"
        title="Zoom out"
      />,
    ],
    [handleZoomIn, handleZoomOut],
  );

  // Apply scale factor dynamically
  const customStyles: CSSProperties = {
    '--datamapper-scale-factor': scaleFactor,
  } as CSSProperties;

  return (
    <Split className="source-target-view" style={customStyles} ref={containerRef}>
      <SplitItem className="source-target-view__source-split" isFilled>
        <SourcePanel actionItems={datamapperActionItems} />
      </SplitItem>

      <SplitItem ref={mappingLinkCanvasRef} className="source-target-view__line-blank" />

      <SplitItem className="source-target-view__target-split" isFilled>
        <TargetPanel />
      </SplitItem>

      <MappingLinksContainer />
    </Split>
  );
};
