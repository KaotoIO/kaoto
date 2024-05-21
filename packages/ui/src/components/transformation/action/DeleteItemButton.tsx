import { FunctionComponent } from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';

type DeleteItemButtonProps = {
  itemName: string;
  onClick: () => void;
};

export const DeleteItemButton: FunctionComponent<DeleteItemButtonProps> = ({ itemName, onClick }) => {
  return (
    <Tooltip content={<div>Delete {itemName} from mapping</div>}>
      <Button
        variant="plain"
        aria-label="Delete ${itemName}"
        data-testid={`delete-${itemName}-button`}
        onClick={onClick}
        icon={<TrashIcon />}
      ></Button>
    </Tooltip>
  );
};
