import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { useState } from 'react';

import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { useGraphLayout } from '../../Custom/hooks/use-graph-layout.hook';
import { HiddenCanvas } from './HiddenCanvas';

export function FlowExportImage() {
  const [isExporting, setIsExporting] = useState(false);
  const { visualEntities } = useEntityContext();

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
        icon={<ImageIcon />}
        onClick={onClick}
        variant="control"
        data-testid="exportImageButton"
        isDisabled={isExporting}
        isLoading={isExporting}
      />

      {isExporting && (
        <HiddenCanvas autoDownload entities={visualEntities} layout={currentLayout} onComplete={handleExportComplete} />
      )}
    </>
  );
}
