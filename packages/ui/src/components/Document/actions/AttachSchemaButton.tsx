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
import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import {
  Alert,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  InputGroupText,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { FileImportIcon, ImportIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { useCanvas } from '../../../hooks/useCanvas';
import { useDataMapper } from '../../../hooks/useDataMapper';
import {
  CreateDocumentResult,
  DocumentDefinitionType,
  DocumentType,
  RootElementOption,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_XML,
} from '../../../models/datamapper/document';
import { MetadataContext } from '../../../providers';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../../services/datamapper-step.service';
import { DocumentService } from '../../../services/document.service';

type AttachSchemaProps = {
  documentType: DocumentType;
  documentId: string;
  documentReferenceId: string;
  hasSchema?: boolean;
};

export const AttachSchemaButton: FunctionComponent<AttachSchemaProps> = ({
  documentType,
  documentId,
  documentReferenceId,
  hasSchema = false,
}) => {
  const api = useContext(MetadataContext)!;
  const { setIsLoading, updateDocument } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [selectedSchemaType, setSelectedSchemaType] = useState<DocumentDefinitionType>(
    DocumentDefinitionType.XML_SCHEMA,
  );
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [createDocumentResult, setCreateDocumentResult] = useState<CreateDocumentResult | null>(null);

  const actionName = hasSchema ? 'Update' : 'Attach';

  const fileNamePattern = useMemo(() => {
    if (documentType === DocumentType.SOURCE_BODY) {
      return DataMapperStepService.supportsJsonBody() ? SCHEMA_FILE_NAME_PATTERN : SCHEMA_FILE_NAME_PATTERN_XML;
    }
    return SCHEMA_FILE_NAME_PATTERN;
  }, [documentType]);

  const documentTypeLabel = useMemo(() => {
    if (documentType === DocumentType.PARAM) return `Parameter: ${documentId}`;
    return documentType === DocumentType.SOURCE_BODY ? 'Source' : 'Target';
  }, [documentId, documentType]);

  const showJsonSchemaOption = useMemo(() => {
    if (documentType === DocumentType.SOURCE_BODY) {
      return DataMapperStepService.supportsJsonBody();
    }
    return true;
  }, [documentType]);

  const onModalOpen = useCallback(() => {
    setIsWarningModalOpen(false);
    setIsModalOpen(true);
  }, []);

  const onFileUpload = useCallback(async () => {
    setCreateDocumentResult(null);
    setFilePaths([]);

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
        if (!DataMapperStepService.supportsJsonBody()) {
          setCreateDocumentResult({
            validationStatus: 'error',
            errors: [
              'JSON source body is not supported. The xslt-saxon component requires the useJsonBody parameter which is not available in this Camel version. Please use parameter for JSON source.',
            ],
          });
          return;
        }
      } else if (!['.xml', '.xsd'].includes(fileExtension)) {
        setCreateDocumentResult({
          validationStatus: 'error',
          errors: [`Unknown file extension '${fileExtension}'. Only XML schema file (.xml, .xsd) is supported.`],
        });
        return;
      }
    } else if (!['.json', '.xsd', '.xml'].includes(fileExtension)) {
      setCreateDocumentResult({
        validationStatus: 'error',
        errors: [
          `Unknown file extension '${fileExtension}'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.`,
        ],
      });
      return;
    }

    const schemaType =
      fileExtension === '.json' ? DocumentDefinitionType.JSON_SCHEMA : DocumentDefinitionType.XML_SCHEMA;

    const result = await DocumentService.createDocument(api, documentType, schemaType, documentId, pathsArray);
    setCreateDocumentResult(result);

    if (result.validationStatus === 'success') {
      setFilePaths(pathsArray);
      setSelectedSchemaType(schemaType);
    }
  }, [api, fileNamePattern, documentType, documentId]);

  const hasRootElementOptions: boolean = useMemo(() => {
    if (!createDocumentResult?.rootElementOptions) return false;
    return createDocumentResult.rootElementOptions.length > 0;
  }, [createDocumentResult?.rootElementOptions]);

  const onUpdateRootElement = useCallback(
    (option: RootElementOption) => {
      if (!createDocumentResult?.document || !createDocumentResult?.documentDefinition) return;
      createDocumentResult.documentDefinition.rootElementChoice = option;
      createDocumentResult.document = DocumentService.updateRootElement(createDocumentResult?.document, option);
    },
    [createDocumentResult],
  );

  const onCommit = useCallback(async () => {
    if (!createDocumentResult?.document || !createDocumentResult.documentDefinition) {
      setCreateDocumentResult({ validationStatus: 'error', errors: ['Please select a schema file first'] });
      return;
    }

    setIsLoading(true);
    try {
      updateDocument(createDocumentResult.document, createDocumentResult.documentDefinition, documentReferenceId);
      clearNodeReferencesForDocument(documentType, documentId);
      reloadNodeReferences();
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      const cause = error['message'] ? ': ' + error['message'] : '';
      setCreateDocumentResult({ validationStatus: 'error', errors: [`Cannot attach the schema ${cause}`] });
    } finally {
      setIsLoading(false);
    }
    setIsModalOpen(false);
    setCreateDocumentResult(null);
    setFilePaths([]);
  }, [
    clearNodeReferencesForDocument,
    documentId,
    documentType,
    reloadNodeReferences,
    setIsLoading,
    updateDocument,
    createDocumentResult,
    documentReferenceId,
  ]);

  const onCancel = useCallback(() => {
    setIsModalOpen(false);
    setCreateDocumentResult(null);
    setFilePaths([]);
  }, []);

  const onWarningModalOpen = useCallback(() => {
    setIsWarningModalOpen(true);
  }, []);

  const onWarningModalClose = useCallback(() => {
    setIsWarningModalOpen(false);
  }, []);

  const handleWarningModal = useCallback(() => {
    if (actionName === 'Update') {
      onWarningModalOpen();
    } else {
      onModalOpen();
    }
  }, [actionName, onModalOpen, onWarningModalOpen]);

  const isReadyToSubmit = useMemo(() => {
    return (
      filePaths.length > 0 && createDocumentResult?.validationStatus === 'success' && createDocumentResult?.document
    );
  }, [filePaths.length, createDocumentResult]);

  const validationMessage = useMemo(() => {
    return (createDocumentResult?.errors ?? createDocumentResult?.warnings ?? []).join('; ');
  }, [createDocumentResult]);

  return (
    <>
      <Button
        icon={<ImportIcon />}
        variant="plain"
        title={`${actionName} schema`}
        aria-label={`${actionName} schema`}
        data-testid={`attach-schema-${documentType}-${documentId}-button`}
        onClick={handleWarningModal}
      />

      <UpdateWarningModal
        actionName={actionName}
        documentTypeLabel={documentTypeLabel}
        isWarningModalOpen={isWarningModalOpen}
        onModalOpen={onModalOpen}
        onWarningModalClose={onWarningModalClose}
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
                    validated={createDocumentResult?.validationStatus}
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
              {createDocumentResult && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      data-testid="attach-schema-modal-text-helper"
                      variant={createDocumentResult.validationStatus}
                    >
                      {validationMessage}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
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
                {showJsonSchemaOption && (
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
            {hasRootElementOptions && (
              <StackItem>
                <InputGroup>
                  <InputGroupText>Root element</InputGroupText>
                  <InputGroupItem>
                    <RootElementSelect createDocumentResult={createDocumentResult!} onUpdate={onUpdateRootElement} />
                  </InputGroupItem>
                </InputGroup>
              </StackItem>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            key="Attach"
            data-testid="attach-schema-modal-btn-attach"
            variant="primary"
            onClick={onCommit}
            isDisabled={!isReadyToSubmit}
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

type UpdateWarningModalProps = {
  actionName: string;
  documentTypeLabel: string;
  isWarningModalOpen: boolean;
  onModalOpen: () => void;
  onWarningModalClose: () => void;
};

const UpdateWarningModal: FunctionComponent<UpdateWarningModalProps> = ({
  actionName,
  documentTypeLabel,
  isWarningModalOpen,
  onModalOpen,
  onWarningModalClose,
}) => {
  return (
    <Modal isOpen={isWarningModalOpen} variant="small" data-testid="update-schema-warning-modal">
      <ModalHeader title={`${actionName} schema : ( ${documentTypeLabel} )`} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert variant="warning" title="Warning">
              {documentTypeLabel} already has a schema attached. Are you sure you want to replace it? Replacing it might
              result in a loss of any existing data mappings.
            </Alert>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="Update-Schema-Warning-Button"
          data-testid="update-schema-warning-modal-btn-continue"
          variant="primary"
          onClick={onModalOpen}
        >
          Continue
        </Button>
        <Button
          key="Cancel"
          data-testid="update-schema-warning-modal-btn-cancel"
          variant="link"
          onClick={onWarningModalClose}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type RootElementSelectProps = {
  createDocumentResult: CreateDocumentResult;
  onUpdate: (option: RootElementOption) => void;
};

const RootElementSelect: FunctionComponent<RootElementSelectProps> = ({ createDocumentResult, onUpdate }) => {
  const rootQName = DocumentService.getRootElementQName(createDocumentResult.document);
  const initialSelectedOption = rootQName
    ? createDocumentResult.rootElementOptions?.find(
        (option) =>
          option.namespaceUri === (rootQName.getNamespaceURI() || '') && option.name === rootQName.getLocalPart(),
      )
    : undefined;

  const [selectedItem, setSelectedItem] = useState<TypeaheadItem | undefined>(
    initialSelectedOption
      ? {
          name: initialSelectedOption.name,
          value: initialSelectedOption.name,
          description: initialSelectedOption.namespaceUri,
        }
      : undefined,
  );

  const items: TypeaheadItem[] = useMemo(() => {
    if (!createDocumentResult?.rootElementOptions) return [];
    return createDocumentResult.rootElementOptions.map((option) => ({
      name: option.name,
      value: option.name,
      description: option.namespaceUri ? `Namespace URI: ${option.namespaceUri}` : undefined,
    }));
  }, [createDocumentResult?.rootElementOptions]);

  const handleSelectionChange = useCallback(
    (item?: TypeaheadItem) => {
      if (!createDocumentResult.rootElementOptions || !item?.value) return;
      const option = createDocumentResult.rootElementOptions.find((opt) => opt.name === item.value);
      if (option) {
        onUpdate(option);
        setSelectedItem(item);
      }
    },
    [createDocumentResult.rootElementOptions, onUpdate],
  );

  return (
    <Typeahead
      id="attach-schema-root-element"
      data-testid="attach-schema-root-element"
      aria-label="Attach schema / Choose Root Element"
      placeholder={selectedItem?.name}
      selectedItem={selectedItem}
      onChange={handleSelectionChange}
      items={items}
    />
  );
};
