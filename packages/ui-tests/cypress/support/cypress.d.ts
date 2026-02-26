// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
export {};

declare global {
  type ActionType =
    | 'append'
    | 'prepend'
    | 'duplicate'
    | 'move-before'
    | 'move-next'
    | 'copy'
    | 'paste-as-child'
    | 'paste-as-special-child'
    | 'paste-as-next-step'
    | 'replace'
    | 'insert'
    | 'insert-special'
    | 'delete'
    | 'disable'
    | 'enable-all'
    | 'container-remove';

  namespace Cypress {
    interface Chainable {
      // default
      openHomePage(): Chainable<JQuery<Element>>;
      openHomePageWithPreExistingRoutes(): Chainable<JQuery<Element>>;
      waitSchemasLoading(): Chainable<JQuery<Element>>;
      openTopbarKebabMenu(): Chainable<JQuery<Element>>;
      openAboutModal(): Chainable<JQuery<Element>>;
      closeAboutModal(): Chainable<JQuery<Element>>;
      expandVisualization(): Chainable<JQuery<Element>>;
      openDesignPage(): Chainable<JQuery<Element>>;
      openSourceCode(): Chainable<JQuery<Element>>;
      openBeans(): Chainable<JQuery<Element>>;
      openMetadata(): Chainable<JQuery<Element>>;
      openSettings(): Chainable<JQuery<Element>>;
      openPipeErrorHandler(): Chainable<JQuery<Element>>;
      openCatalog(): Chainable<JQuery<Element>>;
      addNewRoute(): Chainable<JQuery<Element>>;
      deleteRoute(index: number): Chainable<JQuery<Element>>;
      deleteRouteInCanvas(routeName: string): Chainable<JQuery<Element>>;
      cancelDeleteRoute(index: number): Chainable<JQuery<Element>>;
      toggleFlowsList(): Chainable<JQuery<Element>>;
      toggleRouteVisibility(index: number): Chainable<JQuery<Element>>;
      renameRoute(oldName: string, newName: string): Chainable<JQuery<Element>>;
      closeFlowsListIfVisible(): Chainable<JQuery<Element>>;
      openFlowsListIfClosed(): Chainable<JQuery<Element>>;
      switchIntegrationType(type: string): Chainable<JQuery<Element>>;
      allignAllRoutesVisibility(switchvisibility: string): Chainable<JQuery<Element>>;
      hideAllRoutes(): Chainable<JQuery<Element>>;
      showAllRoutes(): Chainable<JQuery<Element>>;
      openDataMapper(): Chainable<JQuery<Element>>;
      allowClipboardAccess(): Chainable<JQuery<Element>>;
      addValueToClipboard(value: object): Chainable<JQuery<Element>>;
      assertValueCopiedToClipboard(expectedValue: object): Chainable<JQuery<Element>>;
      // design
      openGroupConfigurationTab(step: string, stepIndex?: number): Chainable<JQuery<Element>>;
      openStepConfigurationTab(step: string, stepIndex?: number): Chainable<JQuery<Element>>;
      openStepConfigurationTabByPath(path: string): Chainable<JQuery<Element>>;
      toggleExpandGroup(groupName: string): Chainable<JQuery<Element>>;
      fitToScreen(): Chainable<JQuery<Element>>;
      closeStepConfigurationTab(): Chainable<JQuery<Element>>;
      closeCatalogModal(): Chainable<JQuery<Element>>;
      removeNodeByName(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      quickAppendStep(path: string): Chainable<JQuery<Element>>;
      selectDuplicateNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectMoveBeforeNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectMoveAfterNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectCopyNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectPasteNode(inputName: string, pasteType: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectReplaceNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectAppendNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectDisableNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectEnableAllNodes(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectInsertSpecialNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectInsertNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectPrependNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectRemoveGroup(groupName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      performNodeAction(nodeName: string, action: ActionType, nodeIndex?: number): Chainable<JQuery<Element>>;
      forcePerformNodeAction(nodeName: string, action: ActionType, nodeIndex?: number): Chainable<JQuery<Element>>;
      checkNodeExist(inputName: string, nodesCount: number): Chainable<JQuery<Element>>;
      checkEdgeExists(scope: string, sourceName: string, targetName: string): Chainable<JQuery<Element>>;
      deleteBranch(branchIndex: number): Chainable<JQuery<Element>>;
      selectCamelRouteType(type: string, subType?: string): Chainable<JQuery<Element>>;
      selectRuntimeVersion(type: string): Chainable<JQuery<Element>>;
      hoverOnRuntime(type: string): Chainable<JQuery<Element>>;
      checkCatalogVersion(version: string): Chainable<JQuery<Element>>;
      chooseFromCatalog(nodeType: string, name: string): Chainable<JQuery<Element>>;
      checkCatalogEntryExists(nodeType: string, name: string): Chainable<JQuery<Element>>;
      checkCatalogEntryNotExists(nodeType: string, name: string): Chainable<JQuery<Element>>;
      checkLightMode(): Chainable<JQuery<Element>>;
      checkDarkMode(): Chainable<JQuery<Element>>;
      switchCodeToXml(): Chainable<JQuery<Element>>;
      switchCodeToYaml(): Chainable<JQuery<Element>>;
      DnDOnNode(sourceNode: string, targetNode: string): Chainable<JQuery<Element>>;
      DnDOnEdge(sourceNode: string, targetEdge: string): Chainable<JQuery<Element>>;
      // nodeConfiguration
      interactWithConfigInputObject(inputName: string, value?: string): Chainable<JQuery<Element>>;
      interactWithExpressionInputObject(inputName: string, value?: string, index?: number): Chainable<JQuery<Element>>;
      addExpressionResultType(value: string, index?: number): Chainable<JQuery<Element>>;
      checkExpressionResultType(value: string): Chainable<JQuery<Element>>;
      checkConfigCheckboxObject(inputName: string, value: boolean): Chainable<JQuery<Element>>;
      checkExpressionConfigInputObject(inputName: string, value: string): Chainable<JQuery<Element>>;
      checkConfigInputObject(inputName: string, value: string): Chainable<JQuery<Element>>;
      selectExpression(expression: string, index?: number): Chainable<JQuery<Element>>;
      selectInTypeaheadField(inputGroup: string, value: string): Chainable<JQuery<Element>>;
      configureBeanReference(inputName: string, value: string): Chainable<JQuery<Element>>;
      configureNewBeanReference(inputName: string): Chainable<JQuery<Element>>;
      selectDataformat(dataformat: string): Chainable<JQuery<Element>>;
      selectCustomMetadataEditor(type: string, expression: string): Chainable<JQuery<Element>>;
      configureDropdownValue(inputName: string, value: string): Chainable<JQuery<Element>>;
      deselectNodeBean(inputName: string): Chainable<JQuery<Element>>;
      addProperty(propertyName: string): Chainable<JQuery<Element>>;
      addSingleKVProperty(propertyName: string, key: string, value: string): Chainable<JQuery<Element>>;
      filterFields(filter: string): Chainable<JQuery<Element>>;
      selectFormTab(tab: string): Chainable<JQuery<Element>>;
      specifiedFormTab(tab: string): Chainable<JQuery<Element>>;
      addStringProperty(selector: string, key: string, value: string): Chainable<JQuery<Element>>;
      expandWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      closeWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      switchWrappedSection(sectionName: string, wrapped: boolean): Chainable<JQuery<Element>>;
      generateDocumentationPreview(): Chainable<JQuery<Element>>;
      documentationTableCompare(routeName: string, expectedTableData: string[][]): Chainable<JQuery<Element>>;
      toggleMediaTypeField(nodeName: string): Chainable<JQuery<Element>>;
      selectMediaTypes(nodeName: string, mediaType: string[]): Chainable<JQuery<Element>>;
      // metadata
      expandWrappedMetadataSection(sectionName: string): Chainable<JQuery<Element>>;
      closeWrappedMetadataSection(sectionName: string): Chainable<JQuery<Element>>;
      switchWrappedMetadataSection(sectionName: string, wrapped: boolean): Chainable<JQuery<Element>>;
      addMetadataStringProperty(selector: string, key: string, value: string): Chainable<JQuery<Element>>;
      addMetadataObjectProperty(
        selector: string,
        objectKey: string,
        key: string,
        value: string,
      ): Chainable<JQuery<Element>>;
      forceSelectMetadataRow(rowIndex: number): Chainable<JQuery<Element>>;
      addMetadataField(fieldName: string): Chainable<JQuery<Element>>;
      // sourceCode
      editorScrollToTop(): Chainable<JQuery<Element>>;
      editorScrollToMiddle(): Chainable<JQuery<Element>>;
      waitForEditorToLoad(): Chainable<JQuery<Element>>;
      editorAddText(line: number, text: string): Chainable<JQuery<Element>>;
      uploadFixture(fixture: string): Chainable<JQuery<Element>>;
      editorDeleteLine(line: number, repeatCount: number): Chainable<JQuery<Element>>;
      getMonacoValue(): Chainable<{ sourceCode: string; eol: string }>;
      checkCodeSpanLine(spanText: string, linesCount?: number): Chainable<JQuery<Element>>;
      checkMultiLineContent(text: string[]): Chainable<JQuery<Element>>;
      editorClickUndoXTimes(repeatCount: number): Chainable<JQuery<Element>>;
      editorClickRedoXTimes(repeatCount: number): Chainable<JQuery<Element>>;
      compareFileWithMonacoEditor(filePath: string): Chainable<JQuery<Element>>;
      // DataMapper
      attachSourceBodySchema(filePath: string): Chainable<JQuery<Element>>;
      attachTargetBodySchema(filePath: string | string[]): Chainable<JQuery<Element>>;
      addTargetBodySchema(filePath: string | string[]): Chainable<JQuery<Element>>;
      addParameter(name: string): Chainable<JQuery<Element>>;
      deleteParameter(name: string): Chainable<JQuery<Element>>;
      attachParameterSchema(name: string, filePath: string): Chainable<JQuery<Element>>;
      detachParameterSchema(name: string): Chainable<JQuery<Element>>;
      importMappings(filePath: string): Chainable<JQuery<Element>>;
      exportMappings(): Chainable<JQuery<Element>>;
      closeExportMappingsModal(): Chainable<JQuery<Element>>;
      resetMappings(): Chainable<JQuery<Element>>;
      checkFieldSelected(
        type: string,
        format: string,
        fieldName: string,
        selected: boolean,
      ): Chainable<JQuery<Element>>;
      checkMappingLineSelected(selected: boolean): Chainable<JQuery<Element>>;
      countMappingLines(num: number): Chainable<JQuery<Element>>;
      getDataMapperNode(nodePath: string[]): Chainable<JQuery<HTMLElement>>;
      engageMapping(sourceNodePath: string[], targetNodePath: string[], testXPath: string): Chainable<JQuery<Element>>;
      engageForEachMapping(
        sourceNodePath: string[],
        targetNodePath: string[],
        testXPath: string,
      ): Chainable<JQuery<Element>>;
    }
  }
}
