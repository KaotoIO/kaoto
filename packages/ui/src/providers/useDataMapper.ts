import { useCallback, useContext } from 'react';
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
  executeFieldSearch,
  exportADMArchiveFile,
  fromMappedFieldToIMappingField,
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
} from '../_bk_atlasmap/impl';
import { TransitionMode } from '../_bk_atlasmap/core';
import { DataMapperContext } from './DataMapperProvider';
import { IField } from '../models';
export function useDataMapper() {
  const context = useContext(DataMapperContext);

  if (!context) {
    throw new Error(`useDataMapper must be used inside an DataMapperProvider component`);
  }

  const configModel = initializationService.cfg;

  const { ...state } = context;

  const searchSources = useCallback(
    (term: string) => configModel.documentService.filterDocumentFields(term, true),
    [configModel],
  );
  const searchTargets = useCallback(
    (term: string) => configModel.documentService.filterDocumentFields(term, false),
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
    resetAtlasmap();
  }, []);

  const onAddToMapping = useCallback((node: IField) => {
    const field = node.amField;
    addToCurrentMapping(field);
  }, []);

  const onRemoveFromMapping = useCallback((node: IField) => {
    const field = node.amField;
    removeFromCurrentMapping(field);
  }, []);

  const onCreateMapping = useCallback((source: IField | undefined, target: IField | undefined) => {
    const sourceField = source?.amField;
    const targetField = target?.amField;
    createMapping(sourceField, targetField);
  }, []);

  const isMappingExpressionEmpty = configModel.mappings?.activeMapping?.transition?.expression?.nodes.length === 0;

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
      if (selectedMapping.sourceFields.length <= 1 && selectedMapping.targetFields.length <= 1) {
        return true;
      } else if (isSource && (selectedMapping.targetFields.length <= 1 || selectedMapping.sourceFields.length === 0)) {
        return true;
      } else if (!isSource && (selectedMapping.sourceFields.length <= 1 || selectedMapping.targetFields.length === 0)) {
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
    (documentType: 'source' | 'target', field: IField, dropTarget?: IField): boolean => {
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
      if (selectedMapping.sourceFields.length <= 1 && selectedMapping.targetFields.length <= 1) {
        if (isSource && !selectedMapping.sourceFields.find((f) => f.id === field.id)) {
          return true;
        } else if (
          field.isCollection ||
          field.isInCollection ||
          (!field.isConnected && !selectedMapping.targetFields.find((f) => f.id === field.id))
        ) {
          return true;
        }
      } else if (
        isSource &&
        (selectedMapping.targetFields.length <= 1 || selectedMapping.sourceFields.length === 0) &&
        !selectedMapping.sourceFields.find((f) => f.id === field.id)
      ) {
        return true;
      } else if (
        !isSource &&
        (field.isCollection ||
          field.isInCollection ||
          (!field.isConnected &&
            (selectedMapping.sourceFields.length <= 1 || selectedMapping.targetFields.length === 0) &&
            !selectedMapping.targetFields.find((f) => f.id === field.id)))
      ) {
        return true;
      }
      return false;
    },
    [context],
  );

  const isFieldRemovableFromSelection = useCallback(
    (documentType: 'source' | 'target', field: IField): boolean =>
      !!context.selectedMapping &&
      !!context.selectedMapping[documentType === 'source' ? 'sourceFields' : 'targetFields'].find(
        (f) => f.id === field.id,
      ),
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
    mappingExpressionEnabled: configModel.expressionService.isExpressionEnabledForActiveMapping(),
    currentMappingExpression: configModel.expressionService.getMappingExpressionStr(
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
