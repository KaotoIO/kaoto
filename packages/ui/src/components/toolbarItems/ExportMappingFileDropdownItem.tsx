import { DropdownItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { ExportIcon } from '@patternfly/react-icons';
import { ConfigModel } from '../../_bk_atlasmap/core';
import { useToggle } from '../../hooks/useToggle';
import { ExportMappingDialog } from '../../_bk_atlasmap/UI';

export const ExportMappingFileDropdownItem: FunctionComponent<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const { state, toggleOn, toggleOff } = useToggle(false);

  const onExportMappingFile = useCallback(
    (fileName: string) => {
      const cfg = ConfigModel.getConfig();
      cfg.fileService.exportADMArchive(fileName);
      toggleOff();
      onComplete();
    },
    [onComplete, toggleOff],
  );

  const onClick = useCallback(() => {
    toggleOn();
  }, [toggleOn]);

  return (
    <DropdownItem icon={<ExportIcon />} onClick={onClick} data-testid="export-mappings-button">
      Export the current mappings (.xsl)
      <ExportMappingDialog isOpen={state} onCancel={toggleOff} onConfirm={onExportMappingFile} />;
    </DropdownItem>
  );
};
