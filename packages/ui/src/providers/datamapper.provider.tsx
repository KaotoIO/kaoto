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
import { Alert, AlertActionCloseButton, AlertGroup } from '@patternfly/react-core';
import { cloneDeep } from 'lodash';
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Loading } from '../components/Loading';
import { DEFAULT_DATAMAPPER_SETTINGS, IDataMapperSettings, SendAlertProps } from '../models/datamapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { MappingTree, VariableItem } from '../models/datamapper/mapping';
import { NS_XML_SCHEMA, NS_XPATH_FUNCTIONS, NS_XSL } from '../models/datamapper/standard-namespaces';
import { CanvasView } from '../models/datamapper/view';
import { DataMapperSettingsService } from '../services/datamapper-settings.service';
import { DocumentService } from '../services/document/document.service';
import { MappingService } from '../services/mapping/mapping.service';
import { MappingSerializerService } from '../services/mapping/mapping-serializer.service';
import { WrapperAutoDetectionService } from '../services/mapping/wrapper-auto-detection.service';

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
  targetBodyDocument: IDocument;
  updateDocument: (document: IDocument, definition: DocumentDefinition, previousDocumentReferenceId: string) => void;

  isSourceParametersExpanded: boolean;
  setSourceParametersExpanded: (expanded: boolean) => void;

  mappingTree: MappingTree;
  /** Snapshot of `mappingTree` at the last structural change (node add/remove/move/rename).
   * Stable across value-only updates (e.g. typing an XPath expression), so components that
   * drive expensive rebuilds — such as `TargetPanel`'s `createTree` call — can depend on this
   * instead of `mappingTree` to avoid rebuilding on every keystroke. */
  structuralMappingTree: MappingTree;
  refreshMappingTree(options?: {
    structural?: boolean;
    targetDefinitionType?: DocumentDefinitionType;
    dataMapperSettings?: IDataMapperSettings;
  }): void;
  resetMappingTree(): void;
  variables: VariableItem[];

  alerts: SendAlertProps[];
  sendAlert: (alert: SendAlertProps) => void;

  debug: boolean;
  setDebug(debug: boolean): void;

  dataMapperSettings: IDataMapperSettings;
  updateDataMapperSettings(settings: Partial<IDataMapperSettings>): void;

  isOutputValidationEnabled: boolean;
  setOutputValidationEnabled: (enabled: boolean) => void;
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
  isOutputValidationEnabled?: boolean;
  onSetOutputValidationEnabled?: (enabled: boolean) => void;
};

const INITIAL_NAMESPACE_MAP = { xs: NS_XML_SCHEMA, fn: NS_XPATH_FUNCTIONS, xsl: NS_XSL };

/** Build mutable domain objects before publishing them as React state. */
const createInitialState = (documentInitializationModel?: DocumentInitializationModel, initialXsltFile?: string) => {
  // Documents retain their definitions and wrapper detection updates their metadata. Own a deep
  // copy, including override arrays, so initialization never mutates caller-owned props.
  const initializationModel = cloneDeep(documentInitializationModel);
  const namespaceMap = {
    ...INITIAL_NAMESPACE_MAP,
    ...initializationModel?.namespaceMap,
  };
  const documents = DocumentService.createInitialDocuments(initializationModel, namespaceMap);
  const sourceParameterMap = documents?.sourceParameterMap ?? new Map<string, IDocument>();
  const sourceBodyDocument =
    documents?.sourceBodyDocument ??
    new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
  const targetBodyDocument =
    documents?.targetBodyDocument ??
    new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, targetBodyDocument.definitionType);
  tree.namespaceMap = namespaceMap;
  if (!initialXsltFile) {
    return {
      sourceParameterMap,
      sourceBodyDocument,
      targetBodyDocument,
      mappingTree: tree,
      dataMapperSettings: DEFAULT_DATAMAPPER_SETTINGS,
      alerts: [] as SendAlertProps[],
    };
  }

  const { mappingTree, messages, dataMapperSettings } = MappingSerializerService.deserialize(
    initialXsltFile,
    targetBodyDocument,
    tree,
    sourceParameterMap,
  );
  WrapperAutoDetectionService.autoDetectWrapperSelections(mappingTree, targetBodyDocument, namespaceMap);
  return {
    sourceParameterMap,
    sourceBodyDocument,
    targetBodyDocument,
    mappingTree,
    dataMapperSettings: DataMapperSettingsService.sanitizeForTarget(
      dataMapperSettings,
      targetBodyDocument.definitionType,
    ),
    alerts: messages,
  };
};

export const DataMapperProvider: FunctionComponent<DataMapperProviderProps> = ({
  documentInitializationModel,
  onUpdateDocument,
  onDeleteParameter,
  onRenameParameter,
  initialXsltFile,
  onUpdateMappings,
  onUpdateNamespaceMap,
  isOutputValidationEnabled: isOutputValidationEnabledProp,
  onSetOutputValidationEnabled,
  children,
}) => {
  const [initialState] = useState(() => createInitialState(documentInitializationModel, initialXsltFile));
  const [debug, setDebug] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>(CanvasView.SOURCE_TARGET);
  const [dataMapperSettings, setDataMapperSettings] = useState<IDataMapperSettings>(initialState.dataMapperSettings);
  const previousSettings = useRef<IDataMapperSettings | null>(null);

  const updateDataMapperSettings = useCallback((settings: Partial<IDataMapperSettings>) => {
    setDataMapperSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const setOutputValidationEnabled = useCallback(
    (enabled: boolean) => {
      onSetOutputValidationEnabled?.(enabled);
    },
    [onSetOutputValidationEnabled],
  );

  const [sourceParameterMap, setSourceParameterMap] = useState(initialState.sourceParameterMap);
  const [isSourceParametersExpanded, setSourceParametersExpanded] = useState<boolean>(true);
  const [sourceBodyDocument, setSourceBodyDocument] = useState(initialState.sourceBodyDocument);
  const [targetBodyDocument, setTargetBodyDocument] = useState(initialState.targetBodyDocument);
  const [mappingTree, setMappingTree] = useState(initialState.mappingTree);
  const [structuralMappingTree, setStructuralMappingTree] = useState(initialState.mappingTree);
  const latestMappingTree = useRef(initialState.mappingTree);

  /**
   * Single writer for the mapping tree state. Effects run in declaration order within one commit,
   * so an effect declared below another can still close over a `mappingTree` that its sibling has
   * already replaced. Keeping `latestMappingTree` in step means such an effect can serialize the
   * current tree rather than a render-stale snapshot.
   */
  const applyMappingTree = useCallback((tree: MappingTree, options?: { structural?: boolean }) => {
    latestMappingTree.current = tree;
    setMappingTree(tree);
    if (options?.structural) setStructuralMappingTree(tree);
  }, []);

  const [alerts, setAlerts] = useState<SendAlertProps[]>(initialState.alerts);

  // Notify the host before child effects can publish subsequent mapping edits.
  useLayoutEffect(() => {
    onUpdateMappings?.(
      MappingSerializerService.serialize(
        initialState.mappingTree,
        initialState.sourceParameterMap,
        initialState.dataMapperSettings,
      ),
    );
    onUpdateNamespaceMap?.(initialState.mappingTree.namespaceMap);
    // Initialization callbacks run once per mount, even when their identities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSourceParameters = useCallback(() => {
    setSourceParameterMap(new Map(sourceParameterMap));
  }, [sourceParameterMap]);

  const deleteSourceParameter = useCallback(
    (name: string) => {
      sourceParameterMap.delete(name);
      refreshSourceParameters();
      onDeleteParameter?.(name);
    },
    [onDeleteParameter, refreshSourceParameters, sourceParameterMap],
  );

  const refreshMappingTree = useCallback(
    (options?: {
      structural?: boolean;
      targetDefinitionType?: DocumentDefinitionType;
      dataMapperSettings?: IDataMapperSettings;
    }) => {
      const newMapping = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        options?.targetDefinitionType ?? targetBodyDocument.definitionType,
      );
      newMapping.children = mappingTree.children.map((child) => {
        child.parent = newMapping;
        return child;
      });
      newMapping.globalVariables = mappingTree.globalVariables.map((gv) => {
        gv.parent = newMapping;
        return gv;
      });
      newMapping.namespaceMap = mappingTree.namespaceMap;
      applyMappingTree(newMapping, options);
      const settingsToSerialize = options?.dataMapperSettings ?? dataMapperSettings;
      onUpdateMappings?.(MappingSerializerService.serialize(newMapping, sourceParameterMap, settingsToSerialize));
      onUpdateNamespaceMap?.(newMapping.namespaceMap);
    },
    [
      applyMappingTree,
      dataMapperSettings,
      mappingTree,
      onUpdateMappings,
      onUpdateNamespaceMap,
      sourceParameterMap,
      targetBodyDocument.definitionType,
    ],
  );

  const resetMappingTree = useCallback(() => {
    const newMapping = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, targetBodyDocument.definitionType);
    newMapping.namespaceMap = { ...INITIAL_NAMESPACE_MAP };
    applyMappingTree(newMapping, { structural: true });
    onUpdateMappings?.(MappingSerializerService.serialize(newMapping, sourceParameterMap, dataMapperSettings));
    onUpdateNamespaceMap?.(newMapping.namespaceMap);
  }, [
    applyMappingTree,
    dataMapperSettings,
    onUpdateMappings,
    onUpdateNamespaceMap,
    sourceParameterMap,
    targetBodyDocument.definitionType,
  ]);

  // Re-serialize only when dataMapperSettings actually change (e.g. omitXmlDeclaration toggled).
  useEffect(() => {
    if (isLoading) return;

    // Skip initial setup to prevent serializing immediately on mount
    if (previousSettings.current === null) {
      previousSettings.current = dataMapperSettings;
      return;
    }
    // Only serialize if settings changed, ignoring mappingTree reference changes
    if (previousSettings.current === dataMapperSettings) return;

    previousSettings.current = dataMapperSettings;
    onUpdateMappings?.(
      MappingSerializerService.serialize(latestMappingTree.current, sourceParameterMap, dataMapperSettings),
    );
  }, [dataMapperSettings, isLoading, onUpdateMappings, sourceParameterMap]);

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
      refreshMappingTree({ structural: true });

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
      applyMappingTree(cleaned);
    },
    [applyMappingTree, mappingTree, sourceBodyDocument, sourceParameterMap, targetBodyDocument],
  );

  const updateDocument = useCallback(
    (document: IDocument, definition: DocumentDefinition, previousDocumentReferenceId: string) => {
      /** For removing stale mappings when the document structure has changed, we need to know the previous
       * documentReferenceId. This is especially important for JSON Schema where the documentId and documentReferenceId
       * can be different.
       */
      removeStaleMappings(document.documentType, document.documentId, document, previousDocumentReferenceId);
      // Shallow clone to create new reference — triggers React re-render after in-place mutations
      const cloned = Object.assign(Object.create(Object.getPrototypeOf(document)), document);
      switch (document.documentType) {
        case DocumentType.SOURCE_BODY:
          setSourceBodyDocument(cloned);
          refreshMappingTree({ structural: true });
          break;
        case DocumentType.TARGET_BODY: {
          setTargetBodyDocument(cloned);
          const sanitizedSettings = DataMapperSettingsService.sanitizeForTarget(
            dataMapperSettings,
            document.definitionType,
          );
          setDataMapperSettings(sanitizedSettings);
          refreshMappingTree({
            structural: true,
            targetDefinitionType: document.definitionType,
            dataMapperSettings: sanitizedSettings,
          });
          break;
        }
        case DocumentType.PARAM:
          sourceParameterMap!.set(document.documentId, cloned);
          refreshSourceParameters();
          refreshMappingTree({ structural: true });
          break;
      }
      onUpdateDocument?.(definition);
    },
    [
      dataMapperSettings,
      onUpdateDocument,
      refreshMappingTree,
      refreshSourceParameters,
      removeStaleMappings,
      sourceParameterMap,
    ],
  );

  const sendAlert = useCallback((option: SendAlertProps) => {
    setAlerts((prev) => [...prev, option]);
  }, []);

  const closeAlert = useCallback((option: SendAlertProps) => {
    setAlerts((prev) => prev.filter((a) => a !== option));
  }, []);

  // Show all variables regardless of scope depth — they are defined via target-side context menu
  // (scope-restricted DnD validation is tracked in a separate issue)
  const variables = useMemo(() => MappingService.getAllVariables(mappingTree), [mappingTree]);

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
      targetBodyDocument,
      updateDocument,
      mappingTree,
      structuralMappingTree,
      refreshMappingTree,
      resetMappingTree,
      variables,
      alerts,
      sendAlert,
      debug,
      setDebug,
      dataMapperSettings,
      updateDataMapperSettings,
      isOutputValidationEnabled: isOutputValidationEnabledProp ?? false,
      setOutputValidationEnabled,
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
    updateDocument,
    mappingTree,
    structuralMappingTree,
    refreshMappingTree,
    resetMappingTree,
    variables,
    alerts,
    sendAlert,
    debug,
    dataMapperSettings,
    updateDataMapperSettings,
    isOutputValidationEnabledProp,
    setOutputValidationEnabled,
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
                variant={option.variant}
                title={option.title}
                timeout
                onTimeout={() => {
                  closeAlert(option);
                }}
                actionClose={
                  <AlertActionCloseButton
                    onClose={() => {
                      closeAlert(option);
                    }}
                  />
                }
              >
                {option.description && <>{option.description}</>}
              </Alert>
            ))}
          </AlertGroup>
          {children}
        </>
      )}
    </DataMapperContext.Provider>
  );
};
