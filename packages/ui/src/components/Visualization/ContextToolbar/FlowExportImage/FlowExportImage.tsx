import { Exception } from '@kaoto/camel-catalog/types';
import { Button } from '@patternfly/react-core';
import { ImageIcon } from '@patternfly/react-icons';
import { toPng } from 'html-to-image';

export const defaultTooltipText = 'Export as image';

export function FlowExportImage() {
  const onClick = () => {
    const node = document.querySelector<HTMLElement>('.pf-topology-container') ?? undefined;
    exportToPng('image', node);
  };

  const exportToPng = (name: string, element: HTMLElement | undefined, isDark?: boolean) => {
    if (element) {
      toPng(element, {
        cacheBust: true,
        backgroundColor: isDark ? '#0f1214' : '#f0f0f0',
        filter: (node) => {
          {
            /**  Filter @patternfly/react-topology controls */
            return !node?.classList?.contains('pf-v6-c-toolbar__group');
          }
        },
      })
        .then((dataUrl: string) => {
          const link = document.createElement('a');
          link.download = `${name}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch((err: Exception) => {
          console.error(err);
        });
    } else {
      console.error('exportToPng called but element is undefined');
    }
  };

  return (
    <Button
      icon={<ImageIcon />}
      title="Export as image"
      onClick={onClick}
      variant="control"
      data-testid="exportImageButton"
    />
  );
}
