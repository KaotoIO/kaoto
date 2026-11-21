import { TrashCan } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent, MouseEvent as ReactMouseEvent } from 'react';

interface EntryActionButtonProps {
  label: string;
  testId: string;
  icon: typeof TrashCan;
  onClick: () => void;
}

/** A button that shows on hover at the end of an Explorer entry's row */
export const EntryActionButton: FunctionComponent<EntryActionButtonProps> = ({
  label,
  testId,
  icon: Icon,
  onClick,
}) => (
  <IconButton
    label={label}
    kind="ghost"
    size="sm"
    align="bottom"
    className="cs--explorer__node-action"
    tabIndex={-1}
    data-testid={testId}
    onClick={(event: ReactMouseEvent) => {
      // Neither select the file nor toggle the folder
      event.stopPropagation();
      onClick();
    }}
  >
    <Icon />
  </IconButton>
);
