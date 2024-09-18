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
import { ChangeEvent, createRef, FunctionComponent, useCallback } from 'react';

import { ImportIcon } from '@patternfly/react-icons';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentType } from '../../../models/datamapper/path';
import { useCanvas } from '../../../hooks/useCanvas';
import { DocumentDefinition, DocumentDefinitionType } from '../../../models/datamapper/document';
import { readFileAsString } from '../../../utils/read-file-as-string';

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
  const { setIsLoading, updateDocumentDefinition } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const fileInputRef = createRef<HTMLInputElement>();

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const onImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      setIsLoading(true);
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const fileContents: Record<string, string> = {};
      const fileContentPromises: Promise<string>[] = [];
      Array.from(files).map((f) => {
        const promise = readFileAsString(f).then((content) => (fileContents[f.name] = content));
        fileContentPromises.push(promise);
      });
      await Promise.allSettled(fileContentPromises);
      const definition = new DocumentDefinition(
        documentType,
        DocumentDefinitionType.XML_SCHEMA,
        documentId,
        fileContents,
      );
      await updateDocumentDefinition(definition);
      clearNodeReferencesForDocument(documentType, documentId);
      reloadNodeReferences();
      setIsLoading(false);
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
