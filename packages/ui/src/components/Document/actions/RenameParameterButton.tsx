import { Button } from '@patternfly/react-core';
import { PencilAltIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

type RenameParameterProps = {
  parameterName: string;
  onRenameClick: () => void;
};

export const RenameParameterButton: FunctionComponent<RenameParameterProps> = ({ parameterName, onRenameClick }) => {
  return (
    <Button
      icon={<PencilAltIcon />}
      variant="plain"
      title="Rename parameter"
      aria-label="Rename parameter"
      data-testid={`rename-parameter-${parameterName}-button`}
      onClick={onRenameClick}
    />
  );
};
