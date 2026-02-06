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
import { Alert, AlertActionCloseButton, AlertGroup, AlertProps, AlertVariant } from '@patternfly/react-core';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { Loading } from '../components/Loading';
import { SendAlertProps } from '../models/datamapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { MappingTree } from '../models/datamapper/mapping';
import { NS_XML_SCHEMA, NS_XPATH_FUNCTIONS, NS_XSL } from '../models/datamapper/standard-namespaces';
import { CanvasView } from '../models/datamapper/view';
import { DocumentService } from '../services/document.service';
import { MappingService } from '../services/mapping.service';
import { MappingSerializerService } from '../services/mapping-serializer.service';

export interface IDataMapperContext {
  isLoading: boolean;
  setIsLoading(isLoading: boolean): void;

  activeView: CanvasView;
  setActiveView(view: CanvasView): void;

  sourceParameterMap: Map<string, IDocument>;
  refreshSourceParameters: () => void;
  deleteSourceParameter: (name: string) => void;
  renameSourceParameter: (oldName: string, newName: string) => void;
  sourceBodyDocument: IDocument;
  setSourceBodyDocument: (doc: IDocument) => void;
  targetBodyDocument: IDocument;
  setTargetBodyDocument: (doc: IDocument) => void;
  setNewDocument: (documentType: DocumentType, documentId: string, document: IDocument) => void;
  updateDocument: (document: IDocument, definition: DocumentDefinition, previousDocumentReferenceId: string) => void;

  isSourceParametersExpanded: boolean;
  setSourceParametersExpanded: (expanded: boolean) => void;

  mappingTree: MappingTree;
  refreshMappingTree(): void;
  resetMappingTree(): void;
  setMappingTree(mappings: MappingTree): void;

  alerts: SendAlertProps[];
  sendAlert: (alert: SendAlertProps) => void;

  debug: boolean;
  setDebug(debug: boolean): void;
}

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

type DataMapperProviderProps = PropsWithChildren & {
  documentInitializationModel?: DocumentInitializationModel;
  onUpdateDocument?: (definition: DocumentDefinition) => void;
  onDeleteParameter?: (name: string) => void;
  onRenameParameter?: (oldName: string, newName: string) => void;
  initialXsltFile?: string;
  onUpdateMappings?: (xsltFile: string) => void;
  onUpdateNamespaceMap?: (namespaceMap: Record<string, string>) => void;
};

export const DataMapperProvider: FunctionComponent<DataMapperProviderProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  onDeleteParameter,
  onRenameParameter,
  initialXsltFile,
  onUpdateMappings,
  onUpdateNamespaceMap,
  children,
}) => {
  const [debug, setDebug] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);

  const [sourceParameterMap, setSourceParameterMap] = useState<Map<string, IDocument>>(new Map<string, IDocument>());
  const [isSourceParametersExpanded, setSourceParametersExpanded] = useState<boolean>(true);
  const [sourceBodyDocument, setSourceBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    ),
  );
  const [targetBodyDocument, setTargetBodyDocument] = useState<IDocument>(
    new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    ),
  );

  /**
   * The namespace {@link NS_XPATH_FUNCTIONS} is required not only for JSON mapping,
   * but also for the function calls in the xpath. We should prefill this from beginning.
   */
  const initialNamespaceMap = useMemo(() => {
    return { xs: NS_XML_SCHEMA, fn: NS_XPATH_FUNCTIONS, xsl: NS_XSL };
  }, []);
  const initialMappingTree = new MappingTree(
    DocumentType.TARGET_BODY,
    BODY_DOCUMENT_ID,
    targetBodyDocument.definitionType,
  );
  initialMappingTree.namespaceMap = { ...initialNamespaceMap };
  const [mappingTree, setMappingTree] = useState<MappingTree>(initialMappingTree);

  const [alerts, setAlerts] = useState<SendAlertProps[]>([]);

  useEffect(() => {
    const documents = DocumentService.createInitialDocuments(documentInitializationModel);
    let latestSourceParameterMap = sourceParameterMap;
    let latestTargetBodyDocument = targetBodyDocument;
    if (documents) {
      documents.sourceBodyDocument && setSourceBodyDocument(documents.sourceBodyDocument);
      setSourceParameterMap(documents.sourceParameterMap);
      latestSourceParameterMap = documents.sourceParameterMap;
      if (documents.targetBodyDocument) {
        setTargetBodyDocument(documents.targetBodyDocument);
        latestTargetBodyDocument = documents.targetBodyDocument;
      }
    }
    mappingTree.documentDefinitionType = latestTargetBodyDocument.definitionType;

    const metadataNamespaceMap = documentInitializationModel?.namespaceMap;

    if (metadataNamespaceMap) {
      mappingTree.namespaceMap = {
        ...initialNamespaceMap,
        ...metadataNamespaceMap,
      };
    }

    if (initialXsltFile) {
      const loaded = MappingSerializerService.deserialize(
        initialXsltFile,
        latestTargetBodyDocument,
        mappingTree,
        latestSourceParameterMap,
      );
      setMappingTree(loaded);
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update mapping tree when target document changes
  useEffect(() => {
    refreshMappingTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBodyDocument]);

  const refreshSourceParameters = useCallback(() => {
    setSourceParameterMap(new Map(sourceParameterMap));
  }, [sourceParameterMap]);

  const deleteSourceParameter = useCallback(
    (name: string) => {
      sourceParameterMap.delete(name);
      refreshSourceParameters();
      onDeleteParameter && onDeleteParameter(name);
    },
    [onDeleteParameter, refreshSourceParameters, sourceParameterMap],
  );

  const refreshMappingTree = useCallback(() => {
    const newMapping = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, targetBodyDocument.definitionType);
    newMapping.children = mappingTree.children.map((child) => {
      child.parent = newMapping;
      return child;
    });
    newMapping.namespaceMap = mappingTree.namespaceMap;
    setMappingTree(newMapping);
    onUpdateMappings?.(MappingSerializerService.serialize(newMapping, sourceParameterMap));
    onUpdateNamespaceMap?.(newMapping.namespaceMap);
  }, [mappingTree, onUpdateMappings, onUpdateNamespaceMap, sourceParameterMap, targetBodyDocument.definitionType]);

  const resetMappingTree = useCallback(() => {
    const newMapping = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, targetBodyDocument.definitionType);
    newMapping.namespaceMap = { ...initialNamespaceMap };
    setMappingTree(newMapping);
    onUpdateMappings?.(MappingSerializerService.serialize(newMapping, sourceParameterMap));
    onUpdateNamespaceMap?.(newMapping.namespaceMap);
  }, [
    initialNamespaceMap,
    onUpdateMappings,
    onUpdateNamespaceMap,
    sourceParameterMap,
    targetBodyDocument.definitionType,
  ]);

  const renameSourceParameter = useCallback(
    (oldName: string, newName: string) => {
      if (oldName === newName) return;

      // Get the existing document
      const document = sourceParameterMap.get(oldName);
      if (!document) return;

      // Update the document's properties
      DocumentService.renameDocument(document, newName);

      // Update the sourceParameterMap
      sourceParameterMap.delete(oldName);
      sourceParameterMap.set(newName, document);
      refreshSourceParameters();

      // Update mapping tree to reflect the parameter name change
      MappingService.renameParameterInMappings(mappingTree, oldName, newName);
      refreshMappingTree();

      onRenameParameter?.(oldName, newName);
    },
    [sourceParameterMap, refreshSourceParameters, mappingTree, refreshMappingTree, onRenameParameter],
  );

  const removeStaleMappings = useCallback(
    (documentType: DocumentType, documentId: string, newDocument: IDocument, documentReferenceId: string) => {
      let isFromPrimitive: boolean;
      switch (documentType) {
        case DocumentType.SOURCE_BODY:
          isFromPrimitive = sourceBodyDocument instanceof PrimitiveDocument;
          break;
        case DocumentType.TARGET_BODY:
          isFromPrimitive = targetBodyDocument instanceof PrimitiveDocument;
          break;
        case DocumentType.PARAM:
          isFromPrimitive = sourceParameterMap!.get(documentId) instanceof PrimitiveDocument;
      }
      const isToPrimitive = newDocument instanceof PrimitiveDocument;
      const cleaned =
        isFromPrimitive || isToPrimitive
          ? MappingService.removeAllMappingsForDocument(mappingTree, documentType, documentReferenceId)
          : MappingService.removeStaleMappingsForDocument(mappingTree, newDocument);
      setMappingTree(cleaned);
    },
    [mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument],
  );

  const setNewDocument = useCallback(
    (documentType: DocumentType, documentId: string, newDocument: IDocument) => {
      switch (documentType) {
        case DocumentType.SOURCE_BODY:
          setSourceBodyDocument(newDocument);
          break;
        case DocumentType.TARGET_BODY:
          setTargetBodyDocument(newDocument);
          break;
        case DocumentType.PARAM:
          sourceParameterMap!.set(documentId, newDocument);
          refreshSourceParameters();
          break;
      }
    },
    [refreshSourceParameters, sourceParameterMap],
  );

  const updateDocument = useCallback(
    (document: IDocument, definition: DocumentDefinition, previousDocumentReferenceId: string) => {
      /** For removing stale mappings when the document structure has changed, we need to know the previous
       * documentReferenceId. This is especially important for JSON Schema where the documentId and documentReferenceId
       * can be different.
       */
      removeStaleMappings(document.documentType, document.documentId, document, previousDocumentReferenceId);
      setNewDocument(document.documentType, document.documentId, document);
      refreshMappingTree();
      onUpdateDocument?.(definition);
    },
    [onUpdateDocument, refreshMappingTree, removeStaleMappings, setNewDocument],
  );

  const sendAlert = useCallback(
    (option: SendAlertProps) => {
      alerts.push(option);
      setAlerts([...alerts]);
    },
    [alerts],
  );

  const closeAlert = useCallback(
    (option: Partial<AlertProps>) => {
      const index = alerts.indexOf(option);
      if (index > -1) {
        alerts.splice(index, 1);
        setAlerts([...alerts]);
      }
    },
    [alerts],
  );

  const value = useMemo(() => {
    return {
      isLoading,
      setIsLoading,
      activeView,
      setActiveView,
      sourceParameterMap,
      isSourceParametersExpanded,
      setSourceParametersExpanded,
      refreshSourceParameters,
      deleteSourceParameter,
      renameSourceParameter,
      sourceBodyDocument,
      setSourceBodyDocument,
      targetBodyDocument,
      setTargetBodyDocument,
      setNewDocument,
      updateDocument,
      mappingTree,
      refreshMappingTree,
      resetMappingTree,
      setMappingTree,
      alerts,
      sendAlert,
      debug,
      setDebug,
    };
  }, [
    isLoading,
    activeView,
    sourceParameterMap,
    isSourceParametersExpanded,
    refreshSourceParameters,
    deleteSourceParameter,
    renameSourceParameter,
    sourceBodyDocument,
    targetBodyDocument,
    setNewDocument,
    updateDocument,
    mappingTree,
    refreshMappingTree,
    resetMappingTree,
    alerts,
    sendAlert,
    debug,
  ]);

  return (
    <DataMapperContext.Provider value={value}>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <AlertGroup isToast>
            {alerts.map((option, index) => (
              <Alert
                key={option.key ?? `alert-key-${index}`}
                variant={option.variant ?? AlertVariant.danger}
                title={option.title ?? 'Unknown Error'}
                timeout={option.timeout ?? true}
                onTimeout={() => closeAlert(option)}
                actionClose={<AlertActionCloseButton onClose={() => closeAlert(option)} />}
              >
                {option.description && <>option.description</>}
              </Alert>
            ))}
          </AlertGroup>
          {children}
        </>
      )}
    </DataMapperContext.Provider>
  );
};
