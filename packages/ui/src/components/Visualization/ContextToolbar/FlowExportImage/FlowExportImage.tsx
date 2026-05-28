import { DropPhoto } from '@carbon/icons-react';
import { IconButton, InlineLoading } from '@carbon/react';
import { useContext, useState } from 'react';

import { useVisibleVizNodes } from '../../../../hooks/use-visible-viz-nodes';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { useGraphLayout } from '../../Custom/hooks/use-graph-layout.hook';
import { HiddenCanvas } from './HiddenCanvas';

export function FlowExportImage() {
  const [isExporting, setIsExporting] = useState(false);
  const { visualEntities } = useEntityContext();
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const { vizNodes, isResolving } = useVisibleVizNodes(visualEntities, visibleFlows);

  const onClick = () => {
    setIsExporting(true);
  };

  const handleExportComplete = () => {
    setIsExporting(false);
  };

  const currentLayout = useGraphLayout();

  return (
    <>
      <IconButton
        label="Export as image"
        onClick={onClick}
        kind="ghost"
        data-testid="exportImageButton"
        disabled={isExporting}
      >
        {isExporting ? <InlineLoading /> : <DropPhoto />}
      </IconButton>

      {isExporting && !isResolving && (
        <HiddenCanvas autoDownload vizNodes={vizNodes} layout={currentLayout} onComplete={handleExportComplete} />
      )}
    </>
  );
}
