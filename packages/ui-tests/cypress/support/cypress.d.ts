// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
export {};

declare global {
  namespace Cypress {
    interface Chainable {
      // default
      openHomePage(): Chainable<JQuery<Element>>;
      expandVisualization(): Chainable<JQuery<Element>>;
      openDesignPage(): Chainable<JQuery<Element>>;
      openSourceCode(): Chainable<JQuery<Element>>;
      openBeans(): Chainable<JQuery<Element>>;
      openMetadata(): Chainable<JQuery<Element>>;
      openPipeErrorHandler(): Chainable<JQuery<Element>>;
      openCatalog(): Chainable<JQuery<Element>>;
      // design
      openStepConfigurationTab(step: string, stepIndex?: number): Chainable<JQuery<Element>>;
      interactWithConfigInputObject(inputName: string, value: string): Chainable<JQuery<Element>>;
      fitToScreen(): Chainable<JQuery<Element>>;
      closeStepConfigurationTab(): Chainable<JQuery<Element>>;
      removeNodeByName(inputName: string): Chainable<JQuery<Element>>;
      selectReplaceNode(inputName: string): Chainable<JQuery<Element>>;
      selectAppendNode(inputName: string): Chainable<JQuery<Element>>;
      selectPrependNode(inputName: string): Chainable<JQuery<Element>>;
      performNodeAction(nodeName: string, action: string): Chainable<JQuery<Element>>;
      checkNodeExist(inputName: string, nodesCount: number): Chainable<JQuery<Element>>;
      // metadata
      expandWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      closeWrappedSection(sectionName: string): Chainable<JQuery<Element>>;
      switchWrappedSection(sectionName: string, wrapped: boolean): Chainable<JQuery<Element>>;
      forceSelectMetadataRow(rowIndex: number): Chainable<JQuery<Element>>;
      addMetadataField(fieldName: string): Chainable<JQuery<Element>>;
      // sourceCode
      editorScrollToTop(): Chainable<JQuery<Element>>;
      editorAddText(line: number, text: string): Chainable<JQuery<Element>>;
      uploadFixture(fixture: string): Chainable<JQuery<Element>>;
      editorDeleteLine(line: number, repeatCount: number): Chainable<JQuery<Element>>;
      checkCodeSpanLine(spanText: string, linesCount: number | undefined): Chainable<JQuery<Element>>;
      checkCodeSpanLine(spanText: string): Chainable<JQuery<Element>>;
    }
  }
}
