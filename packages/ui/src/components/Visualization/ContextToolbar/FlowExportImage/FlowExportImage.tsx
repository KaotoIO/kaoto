import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { useVisualizationController } from '@patternfly/react-topology';
import { useState } from 'react';

import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { LayoutType } from '../../Canvas/canvas.models';
import { HiddenCanvas } from './HiddenCanvas';

export function FlowExportImage() {
  const controller = useVisualizationController();
  const [isExporting, setIsExporting] = useState(false);
  const { visualEntities } = useEntityContext();

  const onClick = () => {
    setIsExporting(true);
  };

  const handleExportComplete = () => {
    setIsExporting(false);
  };

  const currentLayout = controller.getGraph().getLayout() as LayoutType | undefined;

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
