import {
  Button,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FileImportIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback, useContext, useMemo, useState } from 'react';

import { useCanvas } from '../../../../hooks/useCanvas';
import { useDataMapper } from '../../../../hooks/useDataMapper';
import {
  CreateDocumentResult,
  DocumentDefinitionType,
  DocumentType,
  RootElementOption,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_XML,
} from '../../../../models/datamapper/document';
import { MetadataContext } from '../../../../providers';
import { DataMapperMetadataService } from '../../../../services/datamapper-metadata.service';
import { DataMapperStepService } from '../../../../services/datamapper-step.service';
import { DocumentService } from '../../../../services/document.service';
import { RootElementSelect } from './RootElementSelect';
import { SchemaFileDataList } from './SchemaFileDataList';
import {
  createSchemaFileItems,
  getFileExtension,
  isJsonExtension,
  validateFileExtension,
  validateNoMixedTypes,
} from './utils';

type AttachSchemaModalProps = {
  isModalOpen: boolean;
  onModalClose: () => void;
  documentType: DocumentType;
  documentId: string;
  documentReferenceId: string;
  actionName: string;
  documentTypeLabel: string;
};

export const AttachSchemaModal: FunctionComponent<AttachSchemaModalProps> = ({
  isModalOpen,
  onModalClose,
  documentType,
  documentId,
  documentReferenceId,
  actionName,
  documentTypeLabel,
}) => {
  const api = useContext(MetadataContext)!;
  const { setIsLoading, updateDocument } = useDataMapper();
  const { clearNodeReferencesForDocument, reloadNodeReferences } = useCanvas();
  const [selectedSchemaType, setSelectedSchemaType] = useState<DocumentDefinitionType>(
    DocumentDefinitionType.XML_SCHEMA,
  );
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [createDocumentResult, setCreateDocumentResult] = useState<CreateDocumentResult | null>(null);

  const fileNamePattern = useMemo(() => {
    if (documentType === DocumentType.SOURCE_BODY) {
      return DataMapperStepService.supportsJsonBody() ? SCHEMA_FILE_NAME_PATTERN : SCHEMA_FILE_NAME_PATTERN_XML;
    }
    return SCHEMA_FILE_NAME_PATTERN;
  }, [documentType]);

  const showJsonSchemaOption = useMemo(() => {
    if (documentType === DocumentType.SOURCE_BODY) {
      return DataMapperStepService.supportsJsonBody();
    }
    return true;
  }, [documentType]);

  const validateAndCreateDocument = useCallback(
    async (allPaths: string[]) => {
      if (allPaths.length === 0) {
        setCreateDocumentResult(null);
        return;
      }

      const firstExt = getFileExtension(allPaths[0]);
      const schemaType = isJsonExtension(firstExt)
        ? DocumentDefinitionType.JSON_SCHEMA
        : DocumentDefinitionType.XML_SCHEMA;

      const result = await DocumentService.createDocument(api, documentType, schemaType, documentId, allPaths);
      setCreateDocumentResult(result);
      setSelectedSchemaType(schemaType);
    },
    [api, documentType, documentId],
  );

  const onFileUpload = useCallback(async () => {
    const paths = await DataMapperMetadataService.selectDocumentSchema(api, fileNamePattern);
    let newPaths: string[] = [];
    if (Array.isArray(paths)) {
      newPaths = paths;
    } else if (paths) {
      newPaths = [paths];
    }
    if (newPaths.length === 0) return;

    const firstNewExt = getFileExtension(newPaths[0]);

    const extensionError = validateFileExtension(firstNewExt, documentType);
    if (extensionError) {
      setCreateDocumentResult({ validationStatus: 'error', errors: [{ message: extensionError }] });
      return;
    }

    const mixedTypeError = validateNoMixedTypes(firstNewExt, filePaths);
    if (mixedTypeError) {
      setCreateDocumentResult({ validationStatus: 'error', errors: [{ message: mixedTypeError }] });
      return;
    }

    const combined = [...filePaths];
    for (const p of newPaths) {
      if (!combined.includes(p)) {
        combined.push(p);
      }
    }

    setFilePaths(combined);
    await validateAndCreateDocument(combined);
  }, [api, fileNamePattern, documentType, filePaths, validateAndCreateDocument]);

  const onRemoveFile = useCallback(
    async (filePathToRemove: string) => {
      const remaining = filePaths.filter((p) => p !== filePathToRemove);
      setFilePaths(remaining);

      if (remaining.length === 0) {
        setCreateDocumentResult(null);
        setSelectedSchemaType(DocumentDefinitionType.XML_SCHEMA);
        return;
      }

      if (createDocumentResult?.documentDefinition) {
        const result = DocumentService.removeSchemaFile(createDocumentResult.documentDefinition, filePathToRemove);
        if (result.document) {
          setCreateDocumentResult(result);
          return;
        }
      }
      await validateAndCreateDocument(remaining);
    },
    [filePaths, validateAndCreateDocument, createDocumentResult],
  );

  const onRemoveAllFiles = useCallback(() => {
    setFilePaths([]);
    setCreateDocumentResult(null);
    setSelectedSchemaType(DocumentDefinitionType.XML_SCHEMA);
  }, []);

  const hasRootElementOptions: boolean = useMemo(() => {
    if (!createDocumentResult?.rootElementOptions) return false;
    return createDocumentResult.rootElementOptions.length > 0;
  }, [createDocumentResult?.rootElementOptions]);

  const selectedRootOption: RootElementOption | undefined = useMemo(() => {
    const rootQName = DocumentService.getRootElementQName(createDocumentResult?.document);
    if (!rootQName || !createDocumentResult?.rootElementOptions) return undefined;
    return createDocumentResult.rootElementOptions.find(
      (opt) => opt.name === rootQName.getLocalPart() && opt.namespaceUri === (rootQName.getNamespaceURI() || ''),
    );
  }, [createDocumentResult]);

  const onUpdateRootElement = useCallback(
    (option: RootElementOption) => {
      if (!createDocumentResult?.document || !createDocumentResult?.documentDefinition) return;
      createDocumentResult.documentDefinition.rootElementChoice = option;
      const updatedDoc = DocumentService.updateRootElement(createDocumentResult.document, option);
      setCreateDocumentResult({ ...createDocumentResult, document: updatedDoc });
    },
    [createDocumentResult],
  );

  const onCommit = useCallback(async () => {
    if (!createDocumentResult?.document || !createDocumentResult.documentDefinition) {
      setCreateDocumentResult({
        validationStatus: 'error',
        errors: [{ message: 'Please select a schema file first' }],
      });
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
      setCreateDocumentResult({
        validationStatus: 'error',
        errors: [{ message: `Cannot attach the schema ${cause}` }],
      });
    } finally {
      setIsLoading(false);
    }
    onModalClose();
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
    onModalClose,
  ]);

  const onCancel = useCallback(() => {
    onModalClose();
    setCreateDocumentResult(null);
    setFilePaths([]);
  }, [onModalClose]);

  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  const isReadyToSubmit = useMemo(() => {
    return filePaths.length > 0 && createDocumentResult?.validationStatus !== 'error' && createDocumentResult?.document;
  }, [filePaths.length, createDocumentResult]);

  const allItems = useMemo(
    () => createSchemaFileItems(createDocumentResult, filePaths),
    [filePaths, createDocumentResult],
  );

  return (
    <Modal
      isOpen={isModalOpen}
      variant="medium"
      data-testid="attach-schema-modal"
      onClick={handleStopPropagation}
      onMouseDown={handleStopPropagation}
      onKeyDown={handleStopPropagation}
    >
      <ModalHeader title={`${actionName} schema : ( ${documentTypeLabel} )`} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <InputGroup>
              <InputGroupItem>
                <Button
                  data-testid="attach-schema-modal-btn-file"
                  icon={<FileImportIcon />}
                  variant="secondary"
                  onClick={onFileUpload}
                >
                  Upload schema file(s)
                </Button>
              </InputGroupItem>
              {filePaths.length > 0 && (
                <InputGroupItem>
                  <Button
                    variant="link"
                    icon={<TrashIcon />}
                    data-testid="attach-schema-remove-all-btn"
                    onClick={onRemoveAllFiles}
                  >
                    Remove all
                  </Button>
                </InputGroupItem>
              )}
            </InputGroup>
          </StackItem>

          <StackItem>
            <SchemaFileDataList items={allItems} onRemoveFile={onRemoveFile} />
          </StackItem>

          {filePaths.length === 0 && (
            <StackItem>
              <HelperText>
                <HelperTextItem data-testid="attach-schema-no-files">No files selected</HelperTextItem>
              </HelperText>
            </StackItem>
          )}

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
                  isDisabled={filePaths.length > 0}
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
                    isDisabled={filePaths.length > 0}
                    onChange={() => setSelectedSchemaType(DocumentDefinitionType.JSON_SCHEMA)}
                  />
                </InputGroupItem>
              )}
            </InputGroup>
          </StackItem>
          {hasRootElementOptions && (
            <StackItem>
              <RootElementSelect
                rootElementOptions={createDocumentResult!.rootElementOptions!}
                selectedOption={selectedRootOption}
                onChange={onUpdateRootElement}
              />
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
  );
};
