import { FunctionComponent } from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';

type DeleteFieldButtonProps = {
  onClick: () => void;
};

export const DeleteFieldButton: FunctionComponent<DeleteFieldButtonProps> = ({ onClick }) => {
  return (
    <Tooltip content={<div>Delete field from mapping</div>}>
      <Button
        variant="plain"
        aria-label="Delete field"
        data-testid={`delete-field-button`}
        onClick={onClick}
        icon={<TrashIcon />}
      ></Button>
    </Tooltip>
  );
};
