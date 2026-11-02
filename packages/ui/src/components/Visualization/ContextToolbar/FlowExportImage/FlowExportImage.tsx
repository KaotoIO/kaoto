import './FlowExportImage.scss';

import { Image as ImageIcon, Renew } from '@carbon/icons-react';
import { Button } from '@patternfly/react-core';
import { useContext, useState } from 'react';

import { useVisibleVizNodes } from '../../../../hooks/use-visible-viz-nodes';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { useGraphLayout } from '../../Custom/hooks/use-graph-layout.hook';
import { HiddenCanvas } from './HiddenCanvas';

export const FlowExportImage = () => {
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
      <Button
        icon={isExporting ? <Renew className="flow-export-image-spinner" /> : <ImageIcon />}
        aria-label="Export as image"
        aria-busy={isExporting}
        onClick={onClick}
        variant="control"
        data-testid="exportImageButton"
        isDisabled={isExporting}
      />

      {isExporting && !isResolving && (
        <HiddenCanvas autoDownload vizNodes={vizNodes} layout={currentLayout} onComplete={handleExportComplete} />
      )}
    </>
  );
};
