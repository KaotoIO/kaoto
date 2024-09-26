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
import { ChangeEvent, createRef, FunctionComponent, useCallback, useContext } from 'react';

import { ImportIcon } from '@patternfly/react-icons';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentType } from '../../../models/datamapper/path';
import { useCanvas } from '../../../hooks/useCanvas';
import { DocumentDefinitionType } from '../../../models/datamapper/document';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { MetadataContext } from '../../../providers';
import { DocumentService } from '../../../services/document.service';

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
  const api = useContext(MetadataContext);
  const { setIsLoading, updateDocumentDefinition } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const fileInputRef = createRef<HTMLInputElement>();

  const onClick = useCallback(async () => {
    if (!api) {
      // fallback: use browser file picker if VSCode Metadata API is not available (standalone/debug mode)
      fileInputRef.current?.click();
      return;
    }

    const paths = await DataMapperMetadataService.selectDocumentSchema(api);
    if (!paths || (Array.isArray(paths) && paths.length === 0)) return;
    setIsLoading(true);
    try {
      const definition = await DocumentService.createDocumentDefinitionFromMetadata(
        api,
        documentType,
        DocumentDefinitionType.XML_SCHEMA,
        documentId,
        Array.isArray(paths) ? paths : [paths],
      );
      if (!definition) return;
      await updateDocumentDefinition(definition);
      clearNodeReferencesForDocument(documentType, documentId);
      reloadNodeReferences();
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    clearNodeReferencesForDocument,
    documentId,
    documentType,
    fileInputRef,
    reloadNodeReferences,
    setIsLoading,
    updateDocumentDefinition,
  ]);

  const onImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      setIsLoading(true);
      try {
        const files = event.target.files;
        if (!files) return;
        const definition = await DocumentService.createDocumentDefinition(
          documentType,
          DocumentDefinitionType.XML_SCHEMA,
          documentId,
          files,
        );
        if (!definition) return;
        await updateDocumentDefinition(definition);
        clearNodeReferencesForDocument(documentType, documentId);
        reloadNodeReferences();
      } finally {
        setIsLoading(false);
      }
    },
    [
      clearNodeReferencesForDocument,
      documentId,
      documentType,
      reloadNodeReferences,
      setIsLoading,
      updateDocumentDefinition,
    ],
  );

  return (
    <Tooltip position={'auto'} enableFlip={true} content={<div>{hasSchema ? 'Update schema' : 'Attach a schema'}</div>}>
      <Button
        variant="plain"
        aria-label={hasSchema ? 'Update schema' : 'Attach schema'}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={onClick}
      >
        <ImportIcon />
        <input
          type="file"
          style={{ display: 'none' }}
          data-testid={`attach-schema-${documentType}-${documentId}-file-input`}
          onChange={onImport}
          accept=".xml, .xsd"
          ref={fileInputRef}
        />
      </Button>
    </Tooltip>
  );
};
