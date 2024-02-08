import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import { DropdownItem } from '@patternfly/react-core';
import { ImportIcon } from '@patternfly/react-icons';
import { useFilePicker } from 'react-sage';
import { ConfigModel } from '../../_bk_atlasmap/core';
import { useConfirmationDialog } from '../dialogs/useConfirmationDialog';

export const ImportMappingFileDropdownItem: FunctionComponent<{ onComplete: () => void }> = ({ onComplete }) => {
  const { files, onClick, HiddenFileInput } = useFilePicker({
    maxFileSize: 1,
  });
  const previouslyUploadedFiles = useRef<File[] | null>(null);

  const [ImportMappingDialog, openImportMappingDialog] = useConfirmationDialog(
    'Import mapping file?',
    'Importing a new mapping file will discard all existing mappings. To save the current mappings, use the Export feature.',
  );

  const onImportMapping = useCallback(
    (file: File) =>
      openImportMappingDialog(() => {
        const cfg = ConfigModel.getConfig();
        cfg.initializationService.initializeWithADMArchiveFile(file);
      }),
    [openImportMappingDialog],
  );

  useEffect(() => {
    if (previouslyUploadedFiles.current !== files) {
      previouslyUploadedFiles.current = files;
      if (files?.length === 1) {
        previouslyUploadedFiles.current = null;
        onImportMapping(files[0]);
        onComplete();
      }
    }
  }, [files, onComplete, onImportMapping]);

  return (
    <DropdownItem icon={<ImportIcon />} onClick={onClick} data-testid="import-mappings-button">
      Import a mapping (.xsl)
      <HiddenFileInput accept=".xsl" multiple={false} />
      {ImportMappingDialog}
    </DropdownItem>
  );
};
