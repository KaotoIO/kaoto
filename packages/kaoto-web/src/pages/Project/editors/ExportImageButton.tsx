import './ExportImageButton.scss';

import { Image, Renew } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { ComponentProps, FunctionComponent } from 'react';

interface ExportImageButtonProps {
  /** There are flows on the canvas to export */
  canExport: boolean;
  /** An export is running; the button turns into a spinner meanwhile */
  isExporting: boolean;
  onExport: () => void;
  /** Where the tooltip opens; the rightmost button of the header bar opens it towards the left */
  align?: ComponentProps<typeof IconButton>['align'];
}

/** Exports the flows on the canvas of the open route as an image */
export const ExportImageButton: FunctionComponent<ExportImageButtonProps> = ({
  canExport,
  isExporting,
  onExport,
  align = 'bottom',
}) => (
  <IconButton
    label="Export as image"
    onClick={onExport}
    disabled={!canExport || isExporting}
    kind="ghost"
    size="sm"
    align={align}
  >
    {isExporting ? <Renew className="cs--export-image-button__spinner" /> : <Image />}
  </IconButton>
);
