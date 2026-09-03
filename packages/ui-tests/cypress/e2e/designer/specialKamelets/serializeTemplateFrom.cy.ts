describe('Tests for Serializing Kamelets', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - move steps in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/template-from.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('parameters.period', '{{period}}', { parseSpecialCharSequences: false });

    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/kamelet/basic.yaml');
  });
});
