import { DropdownItem } from '@patternfly/react-core';
import { ChangeEvent, createRef, FunctionComponent, useCallback } from 'react';
import { ImportIcon } from '@patternfly/react-icons';
import { MappingSerializerService } from '../../../services/mapping-serializer.service';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { readFileAsString } from '../../../utils/read-file-as-string';

type ImportMappingFileDropdownItemProps = {
  onComplete: () => void;
};

export const ImportMappingFileDropdownItem: FunctionComponent<ImportMappingFileDropdownItemProps> = ({
  onComplete,
}) => {
  const { mappingTree, sourceParameterMap, targetBodyDocument, refreshMappingTree } = useDataMapper();
  const fileInputRef = createRef<HTMLInputElement>();

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const onImport = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.item(0);
      if (!file) return;
      readFileAsString(file).then((content) => {
        MappingSerializerService.deserialize(content, targetBodyDocument, mappingTree, sourceParameterMap);
        refreshMappingTree();
        onComplete();
      });
    },
    [mappingTree, onComplete, refreshMappingTree, sourceParameterMap, targetBodyDocument],
  );

  return (
    <>
      <DropdownItem icon={<ImportIcon />} onClick={onClick} data-testid="import-mappings-button">
        Import mappings (.xsl)
      </DropdownItem>
      <input
        type="file"
        style={{ display: 'none' }}
        data-testid="import-mappings-file-input"
        onChange={onImport}
        accept=".xsl, .xslt, .xml"
        ref={fileInputRef}
      />
    </>
  );
};
