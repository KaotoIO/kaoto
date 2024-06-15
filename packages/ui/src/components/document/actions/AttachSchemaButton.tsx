/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { Button, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef } from 'react';

import { ImportIcon } from '@patternfly/react-icons';
import { useFilePicker } from 'react-sage';
import { readFileAsString } from '../../../util';
import { XmlSchemaDocumentService } from '../../../services';
import { useDataMapper } from '../../../hooks';
import { MappingService } from '../../../services/mapping.service';
import { DocumentType } from '../../../models/path';

type AttachSchemaProps = {
  documentType: DocumentType;
  documentId: string;
  hasSchema?: boolean;
};

export const AttachSchemaButton: FunctionComponent<AttachSchemaProps> = ({
  documentType,
  documentId,
  hasSchema = false,
}) => {
  const {
    mappingTree,
    setMappingTree,
    sourceParameterMap,
    refreshSourceParameters,
    setSourceBodyDocument,
    setTargetBodyDocument,
  } = useDataMapper();
  const { files, onClick, HiddenFileInput } = useFilePicker({
    maxFileSize: 1,
  });
  const previouslyUploadedFiles = useRef<File[] | null>(null);

  const onImport = useCallback(
    (file: File) => {
      readFileAsString(file).then((content) => {
        const document = XmlSchemaDocumentService.createXmlSchemaDocument(documentType, documentId, content);
        if (hasSchema) {
          const cleaned = MappingService.removeStaleMappingsForDocument(mappingTree, document);
          setMappingTree(cleaned);
        } else {
          const cleaned = MappingService.removeAllMappingsForDocument(mappingTree, documentType, documentId);
          setMappingTree(cleaned);
        }
        switch (documentType) {
          case DocumentType.SOURCE_BODY:
            setSourceBodyDocument(document);
            break;
          case DocumentType.TARGET_BODY:
            setTargetBodyDocument(document);
            break;
          case DocumentType.PARAM:
            sourceParameterMap.set(documentId, document);
            refreshSourceParameters();
            break;
        }
      });
    },
    [
      documentId,
      documentType,
      hasSchema,
      mappingTree,
      refreshSourceParameters,
      setMappingTree,
      setSourceBodyDocument,
      setTargetBodyDocument,
      sourceParameterMap,
    ],
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
    <Tooltip position={'auto'} enableFlip={true} content={<div>{hasSchema ? 'Update schema' : 'Attach a schema'}</div>}>
      <Button
        variant="plain"
        aria-label={hasSchema ? 'Update schema' : 'Attach schema'}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={onClick}
      >
        <ImportIcon />
        <HiddenFileInput accept={'.xml, .xsd'} />
      </Button>
    </Tooltip>
  );
};
