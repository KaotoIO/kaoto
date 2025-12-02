import './overlay-export.scss';
import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { toPng } from 'html-to-image';
import { useState } from 'react';

export function FlowExportImage() {
  const [isExporting, setIsExporting] = useState(false);

  const onClick = async () => {
    const visibleContainer = document.querySelector('.pf-topology-container') as HTMLElement;
    if (!visibleContainer) return;

    setIsExporting(true);

    try {
      const rect = visibleContainer.getBoundingClientRect();

      const hiddenWrapper = document.createElement('div');
      hiddenWrapper.style.position = 'fixed';
      hiddenWrapper.style.top = '-99999px';
      hiddenWrapper.style.left = '-99999px';
      hiddenWrapper.style.width = `${rect.width}px`;
      hiddenWrapper.style.height = `${rect.height}px`;
      hiddenWrapper.style.pointerEvents = 'none';
      document.body.appendChild(hiddenWrapper);

      const hiddenClone = visibleContainer.cloneNode(true) as HTMLElement;
      hiddenClone.style.width = `${rect.width}px`;
      hiddenClone.style.height = `${rect.height}px`;
      hiddenClone.style.position = 'relative';
      hiddenClone.style.opacity = '1';
      hiddenWrapper.appendChild(hiddenClone);

      const dataUrl = await toPng(hiddenClone, {
        cacheBust: true,
        backgroundColor: '#f0f0f0',
        filter: (node: HTMLElement) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
        canvasWidth: rect.width,
        canvasHeight: rect.height,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'kaoto-flow.png';
      link.click();

      hiddenWrapper.remove();
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
