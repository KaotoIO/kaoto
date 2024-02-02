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
import {
  DataActionPayload,
  IDataState,
  INotificationsState,
  dataReducer,
  initDataState,
  initNotificationsState,
  notificationsReducer,
} from './reducers';
import {
  MappingSerializer,
  TransitionMode,
} from '../core';
import { IAtlasmapDocument, IAtlasmapField } from '../Views';
import {
  FunctionComponent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer, PropsWithChildren,
} from 'react';
import {
  addToCurrentMapping,
  changeDocumentName,
  createConstant,
  createMapping,
  createNamespace,
  createProperty,
  deleteAtlasFile,
  deleteConstant,
  deleteNamespace,
  deleteProperty,
  deselectMapping,
  documentExists,
  editConstant,
  editNamespace,
  editProperty,
  enableCustomClass,
  errorInfoToNotification,
  executeFieldSearch,
  exportADMArchiveFile,
  fromDocumentDefinitionToFieldGroup,
  fromFieldToIFieldsNode,
  fromMappedFieldToIMappingField,
  fromMappingDefinitionToIMappings,
  fromMappingModelToImapping,
  getEnumerationValues,
  getFieldEnums,
  getMappingActions,
  getMappingExpression,
  getMultiplicityActionDelimiters,
  getMultiplicityActions,
  getRuntimeVersion,
  getUIVersion,
  handleActionChange,
  handleIndexChange,
  handleMultiplicityArgumentChange,
  handleMultiplicityChange,
  handleNewTransformation,
  handleRemoveTransformation,
  handleTransformationArgumentChange,
  handleTransformationChange,
  importADMArchiveFile,
  importInstanceSchema,
  importJarFile,
  initializationService,
  isEnumerationMapping,
  mappingExpressionAddField,
  mappingExpressionClearText,
  mappingExpressionInit,
  mappingExpressionInsertText,
  mappingExpressionObservable,
  mappingExpressionRemoveField,
  newMapping,
  onFieldPreviewChange,
  removeFromCurrentMapping,
  removeMappedFieldFromCurrentMapping,
  removeMapping,
  resetAtlasmap,
  selectMapping,
  setSelectedEnumValue,
  toggleExpressionMode,
  toggleMappingPreview,
  toggleShowMappedFields,
  toggleShowUnmappedFields,
  trailerId,
} from './utils';

import { debounceTime } from 'rxjs/operators';

interface IDataMapperContext extends IDataState, INotificationsState {
  onLoading: () => void;
  onReset: () => void;
}
const DataMapperContext = createContext<IDataMapperContext | null>(null);

export interface IDataMapperProviderProps extends PropsWithChildren {
  onMappingChange?: (serializedMappings: string) => void;
}
export const DataMapperProvider: FunctionComponent<IDataMapperProviderProps> = ({
  onMappingChange,
  children,
}) => {
  const [data, dispatchData] = useReducer(dataReducer, {}, initDataState);
  const [notifications, dispatchNotifications] = useReducer(
    notificationsReducer,
    {},
    initNotificationsState,
  );

  const onReset = () => {
    dispatchData({ type: 'reset' });
    dispatchNotifications({
      type: 'reset',
    });
  };

  const onLoading = () => {
    dispatchData({ type: 'loading' });
  };

  const onUpdates = (payload: DataActionPayload) => {
    dispatchData({
      type: 'update',
      payload,
    });
  };

  useEffect(
    function onInitializationCb() {
      onReset();
      initializationService.resetConfig();
      //const cfg = initializationService.cfg;
      initializationService.initialize();
      /*
      const outputDoc: DocumentInitializationModel =
        new DocumentInitializationModel();
      cfg.addDocument(outputDoc);

       */
      onLoading();
    },[]);

  const configModel = initializationService.cfg;

  const convertSources = useCallback(
    function convertSourcesCb() {
      return configModel.sourceDocs
        .map(fromDocumentDefinitionToFieldGroup)
        .filter((d: any) => d) as IAtlasmapDocument[];
    },
    [configModel],
  );

  const convertConstants = useCallback(
    function convertConstantsCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.constantDoc);
    },
    [configModel],
  );

  const convertSourceProperties = useCallback(
    function convertPropertiesCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.sourcePropertyDoc);
    },
    [configModel],
  );

  const convertTargetProperties = useCallback(
    function convertPropertiesCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.targetPropertyDoc);
    },
    [configModel],
  );

  const convertTargets = useCallback(
    function convertTargetsCb() {
      return configModel.targetDocs
        .map(fromDocumentDefinitionToFieldGroup)
        .filter((d) => d) as IAtlasmapDocument[];
    },
    [configModel],
  );

  const convertMappings = useCallback(
    function convertMappingsCb() {
      return fromMappingDefinitionToIMappings(configModel.mappings);
    },
    [configModel],
  );

  const convertSelectedMapping = useCallback(
    function convertSelectedMappingCb() {
      return fromMappingModelToImapping(configModel.mappings?.activeMapping);
    },
    [configModel],
  );

  const convertSourcesToFlatArray = useCallback(
    function convertSourcesToFlatArrayCb(): IAtlasmapField[] {
      return configModel.sourceDocs.flatMap((s) =>
        s.getAllFields().flatMap((f) => {
          const af = fromFieldToIFieldsNode(f);
          return af ? [af] : [];
        }),
      );
    },
    [configModel],
  );
  const convertTargetsToFlatArray = useCallback(
    function convertTargetsToFlatArrayCb() {
      return configModel.targetDocs.flatMap((t) =>
        t.getAllFields().flatMap((f) => {
          const af = fromFieldToIFieldsNode(f);
          return af ? [af] : [];
        }),
      );
    },
    [configModel],
  );

  const onSubUpdate = useCallback(
    function onSubUpdateCb(_caller: string) {
      onUpdates({
        pending: !configModel.initCfg.initialized,
        error: configModel.initCfg.initializationErrorOccurred,
        sources: convertSources(),
        constants: convertConstants(),
        sourceProperties: convertSourceProperties(),
        targets: convertTargets(),
        targetProperties: convertTargetProperties(),
        mappings: convertMappings(),
        selectedMapping: convertSelectedMapping(),
        flatSources: convertSourcesToFlatArray(),
        flatTargets: convertTargetsToFlatArray(),
      });
      dispatchNotifications({
        type: 'update',
        payload: {
          notifications: configModel.errorService
            .getErrors()
            .reverse()
            .filter((e) => e.level !== 'DEBUG')
            .map(errorInfoToNotification),
        },
      });
    },
    [
      configModel,
      convertConstants,
      convertMappings,
      convertSelectedMapping,
      convertSources,
      convertSourceProperties,
      convertSourcesToFlatArray,
      convertTargets,
      convertTargetProperties,
      convertTargetsToFlatArray,
    ],
  );

  useEffect(
    function subscriptionListener() {
      const debounceTimeWindow = data.pending ? 1000 : 50;
      const initializationObservable =
        initializationService.systemInitializedSource.pipe(
          debounceTime(debounceTimeWindow),
        );
      const lineRefreshObservable =
        configModel.mappingService.lineRefreshSource.pipe(
          debounceTime(debounceTimeWindow),
        );
      const mappingUpdatedSource =
        configModel.mappingService.mappingUpdatedSource.pipe(
          debounceTime(debounceTimeWindow),
        );
      const mappingPreview =
        configModel.previewService.mappingPreviewOutput$.pipe(
          debounceTime(debounceTimeWindow),
        );

      const subscriptions = [
        initializationObservable.subscribe(() =>
          onSubUpdate('initializationObservable'),
        ),
        mappingUpdatedSource.subscribe(() =>
          onSubUpdate('mappingUpdatedSource'),
        ),
        mappingPreview.subscribe(() => onSubUpdate('mappingPreviewOutput$')),
        lineRefreshObservable.subscribe(() =>
          onSubUpdate('lineRefreshObservable'),
        ),
        configModel.errorService.subscribe(() => onSubUpdate('errorService')),
      ];

      return () => {
        subscriptions.forEach((s) => s.unsubscribe());
      };
    },
    [
      configModel,
      data.pending,
      data.selectedMapping,
      onSubUpdate,
    ],
  );

  useEffect(
    function onMappingChangeListenerCb() {
      if (onMappingChange) {
        configModel.mappingService.mappingUpdatedSource.subscribe(
          function onMappingChangeListenerSubCb() {
            if (configModel.initCfg.initialized) {
              onMappingChange(
                JSON.stringify(
                  MappingSerializer.serializeMappings(configModel),
                ),
              );
            }
          },
        );
      }
    },
    [configModel, onMappingChange],
  );

  return (
    <DataMapperContext.Provider
      value={{
        ...data,
        ...notifications,
        onLoading,
        onReset,
      }}
    >
      {children}
    </DataMapperContext.Provider>
  );
};

export function useDataMapper() {
  const context = useContext(DataMapperContext);

  if (!context) {
    throw new Error(
      `useDataMapper must be used inside an DataMapperProvider component`,
    );
  }

  const configModel = initializationService.cfg;

  const { onLoading, onReset, ...state } = context;

  const searchSources = useCallback(
    (term: string) =>
      configModel.documentService.filterDocumentFields(term, true),
    [configModel],
  );
  const searchTargets = useCallback(
    (term: string) =>
      configModel.documentService.filterDocumentFields(term, false),
    [configModel],
  );

  const handleImportADMArchiveFile = useCallback(
    (file: File) => {
      importADMArchiveFile(file, configModel);
    },
    [configModel],
  );

  const handleImportJarFile = useCallback(
    (file: File) => {
      importJarFile(file, configModel);
    },
    [configModel],
  );

  const handleResetAtlasmap = useCallback(() => {
    onReset();
    resetAtlasmap();
  }, [onReset]);

  const onAddToMapping = useCallback((node: IAtlasmapField) => {
    const field = node.amField;
    addToCurrentMapping(field);
  }, []);

  const onRemoveFromMapping = useCallback((node: IAtlasmapField) => {
    const field = node.amField;
    removeFromCurrentMapping(field);
  }, []);

  const onCreateMapping = useCallback(
    (
      source: IAtlasmapField | undefined,
      target: IAtlasmapField | undefined,
    ) => {
      const sourceField = source?.amField;
      const targetField = target?.amField;
      createMapping(sourceField, targetField);
    },
    [],
  );

  const isMappingExpressionEmpty =
    configModel.mappings?.activeMapping?.transition?.expression?.nodes
      .length === 0;

  const mappingHasSourceCollection = useCallback(() => {
    return configModel.expressionService.willClearOutSourceFieldsOnTogglingExpression();
  }, [configModel]);

  /**
   * Return true if it's possible to add a source or target field to the current
   * mapping from the specified panel, false otherwise.
   */
  const canAddToSelectedMapping = useCallback(
    (isSource: boolean): boolean => {
      const { selectedMapping } = context;
      if (
        !selectedMapping ||
        (selectedMapping.mapping.transition.mode === TransitionMode.ENUM &&
          selectedMapping.sourceFields.length > 0 &&
          selectedMapping.targetFields.length > 0)
      ) {
        return false;
      }
      if (
        selectedMapping.sourceFields.length <= 1 &&
        selectedMapping.targetFields.length <= 1
      ) {
        return true;
      } else if (
        isSource &&
        (selectedMapping.targetFields.length <= 1 ||
          selectedMapping.sourceFields.length === 0)
      ) {
        return true;
      } else if (
        !isSource &&
        (selectedMapping.sourceFields.length <= 1 ||
          selectedMapping.targetFields.length === 0)
      ) {
        return true;
      }
      return false;
    },
    [context],
  );

  /**
   * Return true if it's possible to add the specified source field to the current mapping
   * from the specified panel, false otherwise.
   */
  const isFieldAddableToSelection = useCallback(
    (
      documentType: 'source' | 'target',
      field: IAtlasmapField,
      dropTarget?: IAtlasmapField,
    ): boolean => {
      const { selectedMapping } = context;
      const isSource = documentType === 'source';
      if (
        !field ||
        !field.amField.isTerminal() ||
        dropTarget?.type === 'UNSUPPORTED' ||
        (selectedMapping &&
          selectedMapping.mapping.transition.mode === TransitionMode.ENUM &&
          selectedMapping.sourceFields.length > 0 &&
          selectedMapping.targetFields.length > 0)
      ) {
        return false;
      }
      if (!selectedMapping || (dropTarget && !dropTarget.isConnected)) {
        return true;
      }
      if (
        selectedMapping.sourceFields.length <= 1 &&
        selectedMapping.targetFields.length <= 1
      ) {
        if (
          isSource &&
          !selectedMapping.sourceFields.find((f) => f.id === field.id)
        ) {
          return true;
        } else if (
          field.isCollection ||
          field.isInCollection ||
          (!field.isConnected &&
            !selectedMapping.targetFields.find((f) => f.id === field.id))
        ) {
          return true;
        }
      } else if (
        isSource &&
        (selectedMapping.targetFields.length <= 1 ||
          selectedMapping.sourceFields.length === 0) &&
        !selectedMapping.sourceFields.find((f) => f.id === field.id)
      ) {
        return true;
      } else if (
        !isSource &&
        (field.isCollection ||
          field.isInCollection ||
          (!field.isConnected &&
            (selectedMapping.sourceFields.length <= 1 ||
              selectedMapping.targetFields.length === 0) &&
            !selectedMapping.targetFields.find((f) => f.id === field.id)))
      ) {
        return true;
      }
      return false;
    },
    [context],
  );

  const isFieldRemovableFromSelection = useCallback(
    (documentType: 'source' | 'target', field: IAtlasmapField): boolean =>
      !!context.selectedMapping &&
      !!context.selectedMapping[
        documentType === 'source' ? 'sourceFields' : 'targetFields'
      ].find((f) => f.id === field.id),
    [context.selectedMapping],
  );

  return {
    ...state,
    selectMapping,
    deselectMapping,
    deleteAtlasFile,
    exportADMArchiveFile: exportADMArchiveFile,
    importADMArchiveFile: handleImportADMArchiveFile,
    importJarFile: handleImportJarFile,
    resetAtlasmap: handleResetAtlasmap,
    getUIVersion: getUIVersion,
    getRuntimeVersion: getRuntimeVersion,
    mappingExpressionClearText,
    isMappingExpressionEmpty,
    executeFieldSearch,
    getFieldEnums,
    setSelectedEnumValue,
    mappingExpressionAddField,
    mappingExpressionInit,
    mappingExpressionInsertText,
    mappingExpressionObservable,
    mappingExpressionRemoveField,
    mappingHasSourceCollection,
    mappingExpressionEnabled:
      configModel.expressionService.isExpressionEnabledForActiveMapping(),
    currentMappingExpression:
      configModel.expressionService.getMappingExpressionStr(
        true,
        configModel.mappings?.activeMapping,
      ),
    getMappingExpression,
    toggleExpressionMode,
    toggleMappingPreview,
    toggleShowMappedFields,
    toggleShowUnmappedFields,
    onFieldPreviewChange,
    addToCurrentMapping,
    removeFromCurrentMapping,
    removeMappedFieldFromCurrentMapping,
    fromMappedFieldToIMappingField,
    createMapping,
    newMapping,
    removeMapping,
    documentExists,
    getMappingActions,
    getMultiplicityActions,
    getMultiplicityActionDelimiters,
    handleActionChange,
    handleIndexChange,
    handleNewTransformation,
    handleRemoveTransformation,
    handleTransformationChange,
    handleTransformationArgumentChange,
    handleMultiplicityChange,
    handleMultiplicityArgumentChange,
    createConstant,
    deleteConstant,
    editConstant,
    createProperty,
    deleteProperty,
    editProperty,
    trailerId,
    canAddToSelectedMapping,
    isFieldAddableToSelection,
    isFieldRemovableFromSelection,
    searchSources,
    searchTargets,
    importInstanceSchema,
    enableCustomClass,
    createNamespace,
    editNamespace,
    deleteNamespace,
    onAddToMapping,
    onRemoveFromMapping,
    onCreateMapping,
    changeDocumentName,
    getEnumerationValues,
    isEnumerationMapping,
    configModel,
  };
}
