import { DropdownItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { ExportIcon } from '@patternfly/react-icons';

export const ExportMappingFileDropdownItem: FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const onClick = useCallback(() => {
    alert('TODO');
    onComplete();
  }, [onComplete]);

  return (
    <DropdownItem icon={<ExportIcon />} onClick={onClick} data-testid="export-mappings-button">
      Export the current mappings (.xsl)
    </DropdownItem>
  );
};
