/*
    Copyright (C) 2024 Red Hat, Inc.

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
import {
  AlertVariant,
  Button,
  InputGroup,
  InputGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { FileImportIcon, ImportIcon } from '@patternfly/react-icons';
import { useCanvas } from '../../../hooks/useCanvas';
import { useDataMapper } from '../../../hooks/useDataMapper';
import {
  DocumentDefinitionType,
  DocumentType,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY,
} from '../../../models/datamapper/document';
import { MetadataContext } from '../../../providers';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
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
  const api = useContext(MetadataContext)!;
  const { addAlert, setIsLoading, updateDocumentDefinition } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSchemaType, setSelectedSchemaType] = useState<DocumentDefinitionType>(
    DocumentDefinitionType.XML_SCHEMA,
  );
  const [filePaths, setFilePaths] = useState<string[]>([]);

  const actionName = hasSchema ? 'Update' : 'Attach';
  const fileNamePattern =
    documentType === DocumentType.SOURCE_BODY ? SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY : SCHEMA_FILE_NAME_PATTERN;

  const documentTypeLabel = useMemo(() => {
    if (documentType === DocumentType.PARAM) return `Parameter: ${documentId}`;
    return documentType === DocumentType.SOURCE_BODY ? 'Source' : 'Target';
  }, [documentId, documentType]);

  const onModalOpen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const onFileUpload = useCallback(async () => {
    const paths = await DataMapperMetadataService.selectDocumentSchema(api, fileNamePattern);
    let pathsArray: string[] = [];
    if (Array.isArray(paths)) {
      pathsArray = paths;
    } else if (paths) {
      pathsArray = [paths];
    }
    if (pathsArray.length === 0) return;

    const fileExtension = pathsArray[0].toLowerCase().substring(pathsArray[0].lastIndexOf('.'));
    if (documentType === DocumentType.SOURCE_BODY) {
      if (fileExtension === '.json') {
        addAlert({
          variant: AlertVariant.danger,
          title:
            'JSON source body is not supported at this moment. For the source body, only XML schema file (.xml, .xsd) is supported. In order to use JSON data, It must be either source parameter or target',
        });
        return;
      } else if (!['.xml', '.xsd'].includes(fileExtension)) {
        addAlert({
          variant: AlertVariant.danger,
          title: `Unknown file extension '${fileExtension}'. Only XML schema file (.xml, .xsd) is supported.`,
        });
        return;
      }
    } else if (!['.json', '.xsd', '.xml'].includes(fileExtension)) {
      addAlert({
        variant: AlertVariant.danger,
        title: `Unknown file extension '${fileExtension}'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.`,
      });
      return;
    }

    setFilePaths(pathsArray);

    if (fileExtension === '.json') {
      setSelectedSchemaType(DocumentDefinitionType.JSON_SCHEMA);
    } else {
      setSelectedSchemaType(DocumentDefinitionType.XML_SCHEMA);
    }
  }, [addAlert, api, documentType, fileNamePattern]);

  const onCommit = useCallback(async () => {
    setIsLoading(true);
    try {
      const definition = await DocumentService.createDocumentDefinition(
        api,
        documentType,
        selectedSchemaType,
        documentId,
        filePaths,
      );
      if (!definition) return;
      await updateDocumentDefinition(definition);
      clearNodeReferencesForDocument(documentType, documentId);
      reloadNodeReferences();
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      const cause = error['message'] ? ': ' + error['message'] : '';
      addAlert({ variant: AlertVariant.danger, title: `Cannot read the schema file ${cause}` });
    } finally {
      setIsLoading(false);
    }
    setIsModalOpen(false);
  }, [
    addAlert,
    api,
    clearNodeReferencesForDocument,
    documentId,
    documentType,
    filePaths,
    reloadNodeReferences,
    setIsLoading,
    updateDocumentDefinition,
  ]);

  const onCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <Button
        icon={<ImportIcon />}
        variant="plain"
        title={`${actionName} schema`}
        aria-label={`${actionName} schema`}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={onModalOpen}
      />
      <Modal isOpen={isModalOpen} variant="small" data-testid="attach-schema-modal">
        <ModalHeader title={`${actionName} schema : ( ${documentTypeLabel} )`} />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    type="text"
                    aria-label="Attaching schema file name"
                    data-testid="attach-schema-modal-text"
                    readOnly
                    value={filePaths.join(', ')}
                  />
                </InputGroupItem>
                <InputGroupItem>
                  <Button data-testid="attach-schema-modal-btn-file" icon={<FileImportIcon />} onClick={onFileUpload} />
                </InputGroupItem>
              </InputGroup>
            </StackItem>
            <StackItem>
              <InputGroup>
                <InputGroupItem>
                  <Radio
                    id="option-xml-schema"
                    name="schema-type"
                    aria-label="XML Schema"
                    label="XML Schema"
                    data-testid="attach-schema-modal-option-xml"
                    isChecked={selectedSchemaType === DocumentDefinitionType.XML_SCHEMA}
                    onChange={() => setSelectedSchemaType(DocumentDefinitionType.XML_SCHEMA)}
                  />
                </InputGroupItem>
                {documentType !== DocumentType.SOURCE_BODY && (
                  <InputGroupItem>
                    <Radio
                      id="option-json-schema"
                      name="schema-type"
                      aria-label="JSON Schema"
                      label="JSON Schema"
                      data-testid="attach-schema-modal-option-json"
                      isChecked={selectedSchemaType === DocumentDefinitionType.JSON_SCHEMA}
                      onChange={() => setSelectedSchemaType(DocumentDefinitionType.JSON_SCHEMA)}
                    />
                  </InputGroupItem>
                )}
              </InputGroup>
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            key="Attach"
            data-testid="attach-schema-modal-btn-attach"
            variant="primary"
            onClick={onCommit}
            isDisabled={filePaths.length === 0}
          >
            {actionName}
          </Button>
          <Button key="Cancel" data-testid="attach-schema-modal-btn-cancel" variant="link" onClick={onCancel}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
