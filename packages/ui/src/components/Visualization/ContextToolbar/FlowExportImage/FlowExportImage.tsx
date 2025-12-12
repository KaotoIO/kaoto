import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { useVisualizationController } from '@patternfly/react-topology';
import { useContext, useState } from 'react';

import { EntitiesContext } from '../../../../providers/entities.provider';
import { LayoutType } from '../../Canvas/canvas.models';
import { HiddenCanvas } from './HiddenCanvas';

export function FlowExportImage() {
  const controller = useVisualizationController();
  const [isExporting, setIsExporting] = useState(false);
  const entitiesContext = useContext(EntitiesContext);

  const onClick = () => {
    setIsExporting(true);
  };

  const handleExportComplete = () => {
    setIsExporting(false);
  };

  if (!entitiesContext) return null;

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
        <HiddenCanvas
          entities={entitiesContext.visualEntities}
          layout={currentLayout}
          onComplete={handleExportComplete}
        />
      )}
    </>
  );
}
