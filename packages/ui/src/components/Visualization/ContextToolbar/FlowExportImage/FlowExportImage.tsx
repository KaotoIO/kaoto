import './overlay-export.scss';

import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { useVisualizationController } from '@patternfly/react-topology';
import { toPng } from 'html-to-image';
import { useContext, useState } from 'react';

import { EntitiesContext } from '../../../../providers/entities.provider';
import { LayoutType } from '../../Canvas/canvas.models';
import { HiddenCanvas } from './HiddenCanvas';

export function FlowExportImage() {
  const controller = useVisualizationController();
  const [isExporting, setIsExporting] = useState(false);
  const entitiesContext = useContext(EntitiesContext);

  const onClick = async () => {
    setIsExporting(true);
  };

  const handleHiddenCanvasReady = async (hiddenSurface: HTMLElement) => {
    try {
      const dataUrl = await toPng(hiddenSurface, {
        cacheBust: false,
        backgroundColor: '#f0f0f0',
        filter: (node: HTMLElement) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
        pixelRatio: 1,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'kaoto-flow.png';
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!entitiesContext) return null;

  const currentLayout = controller.getGraph().getLayout() as LayoutType;

  return (
    <>
      <Button
        icon={<ImageIcon />}
        title="Export as image"
        onClick={onClick}
        variant="control"
        data-testid="exportImageButton"
        isDisabled={isExporting}
      />
      {isExporting && (
        <>
          <HiddenCanvas
            entities={entitiesContext.visualEntities}
            layout={currentLayout || LayoutType.DagreHorizontal}
            onReady={handleHiddenCanvasReady}
          />
          <div className="export-overlay">
            <div className="export-spinner"></div>
          </div>
        </>
      )}
    </>
  );
}
