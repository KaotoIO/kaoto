import { Export } from '@carbon/icons-react';
import { DropdownItem } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

interface ExportMappingFileDropdownItemProps {
  onClick: () => void;
}

export const ExportMappingFileDropdownItem: FunctionComponent<ExportMappingFileDropdownItemProps> = ({ onClick }) => {
  return (
    <DropdownItem icon={<Export />} onClick={onClick} data-testid="dm-debug-export-mappings-button">
      Export current mappings (.xsl)
    </DropdownItem>
  );
};
