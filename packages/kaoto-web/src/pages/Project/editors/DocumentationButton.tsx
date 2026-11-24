import { Download } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { ComponentProps, FunctionComponent } from 'react';

interface DocumentationButtonProps {
  onOpen: () => void;
  /** There is no route documentation to open, as for a file without a canvas */
  disabled?: boolean;
  /** Where the tooltip opens; the rightmost button of the header bar opens it towards the left */
  align?: ComponentProps<typeof IconButton>['align'];
}

/** Opens the documentation preview of the open route, from which the documentation is downloaded */
export const DocumentationButton: FunctionComponent<DocumentationButtonProps> = ({
  onOpen,
  disabled = false,
  align = 'bottom',
}) => (
  <IconButton
    label="Generate route documentation"
    onClick={onOpen}
    disabled={disabled}
    kind="ghost"
    size="sm"
    align={align}
  >
    <Download />
  </IconButton>
);
