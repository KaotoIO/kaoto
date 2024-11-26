// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
export {};

declare global {
  type ActionType =
    | 'append'
    | 'prepend'
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
      cancelDeleteRoute(index: number): Chainable<JQuery<Element>>;
      toggleFlowsList(): Chainable<JQuery<Element>>;
      toggleRouteVisibility(index: number): Chainable<JQuery<Element>>;
      closeFlowsListIfVisible(): Chainable<JQuery<Element>>;
      switchIntegrationType(type: string): Chainable<JQuery<Element>>;
      allignAllRoutesVisibility(switchvisibility: string): Chainable<JQuery<Element>>;
      hideAllRoutes(): Chainable<JQuery<Element>>;
      showAllRoutes(): Chainable<JQuery<Element>>;
      // design
      openRootConfigurationTab(step: string): Chainable<JQuery<Element>>;
      openStepConfigurationTab(step: string, stepIndex?: number): Chainable<JQuery<Element>>;
      toggleExpandGroup(groupName: string): Chainable<JQuery<Element>>;
      fitToScreen(): Chainable<JQuery<Element>>;
      closeStepConfigurationTab(): Chainable<JQuery<Element>>;
      closeCatalogModal(): Chainable<JQuery<Element>>;
      removeNodeByName(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      quickAppend(nodeIndex?: number): Chainable<JQuery<Element>>;
      selectReplaceNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectAppendNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectDisableNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectEnableAllNodes(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectInsertSpecialNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectInsertNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectPrependNode(inputName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      selectRemoveGroup(groupName: string, nodeIndex?: number): Chainable<JQuery<Element>>;
      performNodeAction(nodeName: string, action: ActionType, nodeIndex?: number): Chainable<JQuery<Element>>;
      checkNodeExist(inputName: string, nodesCount: number): Chainable<JQuery<Element>>;
      checkEdgeExists(sourceName: string, targetName: string): Chainable<JQuery<Element>>;
      deleteBranch(branchIndex: number): Chainable<JQuery<Element>>;
      selectCamelRouteType(type: string, subType?: string): Chainable<JQuery<Element>>;
      selectRuntimeVersion(type: string): Chainable<JQuery<Element>>;
      hoverOnRuntime(type: string): Chainable<JQuery<Element>>;
      checkCatalogVersion(version: string): Chainable<JQuery<Element>>;
      chooseFromCatalog(nodeType: string, name: string): Chainable<JQuery<Element>>;
      checkCatalogEntryExists(nodeType: string, name: string): Chainable<JQuery<Element>>;
      checkCatalogEntryNotExists(nodeType: string, name: string): Chainable<JQuery<Element>>;
      // nodeConfiguration
      interactWithExpressionInputObject(inputName: string, value?: string, index?: number): Chainable<JQuery<Element>>;
      addExpressionResultType(value: string, index?: number): Chainable<JQuery<Element>>;
      checkExpressionResultType(value: string): Chainable<JQuery<Element>>;
      interactWithConfigInputObject(inputName: string, value?: string): Chainable<JQuery<Element>>;
      interactWithDataformatInputObject(inputName: string, value?: string): Chainable<JQuery<Element>>;
      checkConfigCheckboxObject(inputName: string, value: boolean): Chainable<JQuery<Element>>;
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
      // metadata
      expandWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      closeWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      switchWrappedSection(sectionName: string, wrapped: boolean): Chainable<JQuery<Element>>;
      forceSelectMetadataRow(rowIndex: number): Chainable<JQuery<Element>>;
      addMetadataField(fieldName: string): Chainable<JQuery<Element>>;
      // sourceCode
      editorScrollToTop(): Chainable<JQuery<Element>>;
      waitForEditorToLoad(): Chainable<JQuery<Element>>;
      editorAddText(line: number, text: string): Chainable<JQuery<Element>>;
      uploadFixture(fixture: string): Chainable<JQuery<Element>>;
      editorDeleteLine(line: number, repeatCount: number): Chainable<JQuery<Element>>;
      checkCodeSpanLine(spanText: string, linesCount?: number): Chainable<JQuery<Element>>;
      checkMultiLineContent(text: string[]): Chainable<JQuery<Element>>;
      editorClickUndoXTimes(repeatCount: number): Chainable<JQuery<Element>>;
      editorClickRedoXTimes(repeatCount: number): Chainable<JQuery<Element>>;
      compareFileWithMonacoEditor(filePath: string): Chainable<JQuery<Element>>;
    }
  }
}
