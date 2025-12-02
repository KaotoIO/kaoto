// packages/ui/src/components/Visualization/ContextToolbar/FlowExportImage/FlowExportImage.tsx
import './overlay-export.scss';

import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { useVisualizationController } from '@patternfly/react-topology';
import { toPng } from 'html-to-image';
import { useState } from 'react';

export function FlowExportImage() {
  const controller = useVisualizationController();
  const [isExporting, setIsExporting] = useState(false);

  const onClick = async () => {
    const visibleContainer = document.querySelector('.pf-topology-container') as HTMLElement;
    if (!visibleContainer) return;

    setIsExporting(true);

    try {
      const hiddenContainer = visibleContainer.cloneNode(true) as HTMLElement;
      hiddenContainer.style.position = 'fixed';
      hiddenContainer.style.top = '-99999px';
      hiddenContainer.style.left = '-99999px';
      hiddenContainer.style.opacity = '0';
      hiddenContainer.style.pointerEvents = 'none';
      document.body.appendChild(hiddenContainer);

      const dataUrl = await toPng(hiddenContainer, {
        cacheBust: true,
        backgroundColor: '#f0f0f0',
        filter: (node: HTMLElement) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'kaoto-flow.png';
      link.click();

      hiddenContainer.remove();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        icon={<ImageIcon />}
        title="Export as image"
        onClick={onClick}
        variant="control"
        data-testid="exportImageButton"
      />
      {isExporting && (
        <div className="export-overlay">
          <div className="export-spinner"></div>
        </div>
      )}
    </>
  );
}
