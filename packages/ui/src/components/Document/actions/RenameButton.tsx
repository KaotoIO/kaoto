import { Edit } from '@carbon/icons-react';
import { Button } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

type RenameButtonProps = {
  /** Used to build the data-testid: `rename-{itemName}-button` */
  itemName: string;
  /** Human-readable entity label used in title/aria: "Rename {label}" */
  label: string;
  onRenameClick: () => void;
};

export const RenameButton: FunctionComponent<RenameButtonProps> = ({ itemName, label, onRenameClick }) => {
  return (
    <Button
      icon={<Edit />}
      variant="plain"
      title={`Rename ${label}`}
      aria-label={`Rename ${label}`}
      data-testid={`rename-${itemName}-button`}
      onClick={onRenameClick}
    />
  );
};
