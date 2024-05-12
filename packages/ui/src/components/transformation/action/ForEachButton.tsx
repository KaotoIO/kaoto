import { FunctionComponent } from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';

type ForEachButtonProps = {
  onClick: () => void;
};

export const ForEachButton: FunctionComponent<ForEachButtonProps> = ({ onClick }) => {
  return (
    <Tooltip content={<div>Process for each collection item</div>}>
      <Button
        variant="link"
        aria-label="For Each"
        data-testid={`for-each-button`}
        onClick={onClick}
        icon={<ListIcon />}
      >
        For Each
      </Button>
    </Tooltip>
  );
};
