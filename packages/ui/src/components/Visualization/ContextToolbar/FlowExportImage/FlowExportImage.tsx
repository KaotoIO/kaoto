import './overlay-export.scss';

import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { Point, useVisualizationController } from '@patternfly/react-topology';
import { toPng } from 'html-to-image';
import { useState } from 'react';

export function FlowExportImage() {
  const controller = useVisualizationController();
  const [isExporting, setIsExporting] = useState(false);

  const onClick = async () => {
    const surface = document.querySelector('.pf-topology-container') as HTMLElement;
    if (!surface) return;

    const graph = controller.getGraph();

    setIsExporting(true);

    const origScale = graph.getGraph().getScale();
    const origPos = graph.getGraph().getPosition();

    graph.reset();
    graph.fit(80);
    graph.layout();

    await new Promise((resolve) => requestAnimationFrame(resolve));

    await exportToPng('image', surface);

    graph.getGraph().setScale(origScale);
    graph.getGraph().setPosition(new Point(origPos.x, origPos.y));
    graph.layout();

    setIsExporting(false);
  };

  const exportToPng = async (name: string, element: HTMLElement) => {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      backgroundColor: '#f0f0f0',
      filter: (node) => !node?.classList?.contains('pf-v6-c-toolbar__group'),
    });

    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = dataUrl;
    link.click();
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
