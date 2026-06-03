import { DropdownItem } from '@patternfly/react-core';
import { ExportIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface ExportMappingFileDropdownItemProps {
  onClick: () => void;
}

export const ExportMappingFileDropdownItem: FunctionComponent<ExportMappingFileDropdownItemProps> = ({ onClick }) => {
  return (
    <DropdownItem icon={<ExportIcon />} onClick={onClick} data-testid="dm-debug-export-mappings-button">
      Export current mappings (.xsl)
    </DropdownItem>
  );
};
