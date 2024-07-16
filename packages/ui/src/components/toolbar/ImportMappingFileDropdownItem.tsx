import { DropdownItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import { ImportIcon } from '@patternfly/react-icons';
import { MappingSerializerService } from '../../services/mapping-serializer.service';
import { useDataMapper } from '../../hooks';
import { useFilePicker } from 'react-sage';
import { readFileAsString } from '../../util';

type ImportMappingFileDropdownItemProps = {
  onComplete: () => void;
};

export const ImportMappingFileDropdownItem: FunctionComponent<ImportMappingFileDropdownItemProps> = ({
  onComplete,
}) => {
  const { mappingTree, sourceParameterMap, targetBodyDocument, refreshMappingTree } = useDataMapper();

  const { files, onClick, HiddenFileInput } = useFilePicker({
    maxFileSize: 1,
  });
  const previouslyUploadedFiles = useRef<File[] | null>(null);

  const onImport = useCallback(
    (file: File) => {
      readFileAsString(file).then((content) => {
        MappingSerializerService.deserialize(content, targetBodyDocument, mappingTree, sourceParameterMap);
        refreshMappingTree();
        onComplete();
      });
    },
    [mappingTree, onComplete, refreshMappingTree, sourceParameterMap, targetBodyDocument],
  );

  useEffect(() => {
    if (previouslyUploadedFiles.current !== files) {
      previouslyUploadedFiles.current = files;
      if (files?.length === 1) {
        onImport(files[0]);
      }
    }
  }, [files, onImport]);

  return (
    <>
      <DropdownItem icon={<ImportIcon />} onClick={onClick} data-testid="import-mappings-button">
        Import mappings (.xsl)
      </DropdownItem>
      <HiddenFileInput accept=".xsl, .xslt, .xml" />
    </>
  );
};
