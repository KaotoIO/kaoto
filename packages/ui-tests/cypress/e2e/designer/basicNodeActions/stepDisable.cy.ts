describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - disable steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectDisableNode('setHeader');
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.openSourceCode();
    cy.checkCodeSpanLine('disabled: true', 1);
  });
});
