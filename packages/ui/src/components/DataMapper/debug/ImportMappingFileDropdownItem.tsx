import { DropdownItem } from '@patternfly/react-core';
import { ImportIcon } from '@patternfly/react-icons';
import { ChangeEvent, createRef, FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import { readFileAsString } from '../../../stubs/read-file-as-string';

type ImportMappingFileDropdownItemProps = {
  onComplete: () => void;
};

export const ImportMappingFileDropdownItem: FunctionComponent<ImportMappingFileDropdownItemProps> = ({
  onComplete,
}) => {
  const { mappingTree, sourceParameterMap, targetBodyDocument, refreshMappingTree, sendAlert } = useDataMapper();
  const fileInputRef = createRef<HTMLInputElement>();

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0);
      if (!file) return;
      readFileAsString(file)
        .then((content) => {
          const { messages } = MappingSerializerService.deserialize(
            content,
            targetBodyDocument,
            mappingTree,
            sourceParameterMap,
          );
          for (const msg of messages) {
            sendAlert(msg);
          }
          refreshMappingTree();
          onComplete();
        })
        .catch((error: unknown) => {
          sendAlert({
            variant: 'danger',
            title: 'Failed to import mapping file',
            description: error instanceof Error ? error.message : String(error),
          });
        });
    },
    [mappingTree, onComplete, refreshMappingTree, sendAlert, sourceParameterMap, targetBodyDocument],
  );

  return (
    <>
      <DropdownItem icon={<ImportIcon />} onClick={onClick} data-testid="dm-debug-import-mappings-button">
        Import mappings (.xsl)
      </DropdownItem>
      <input
        type="file"
        style={{ display: 'none' }}
        data-testid="dm-debug-import-mappings-file-input"
        onChange={onImport}
        accept=".xsl, .xslt, .xml"
        ref={fileInputRef}
      />
    </>
  );
};
