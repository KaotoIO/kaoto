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
    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.openSourceCode();
    cy.checkCodeSpanLine('disabled: true', 1);
  });

  it('Design - disable and enable multiple steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectDisableNode('setHeader');
    cy.selectDisableNode('marshal');
    cy.selectDisableNode('log');

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', true);
    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', true);
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');
    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.openDesignPage();
    cy.selectEnableAllNodes('setHeader');

    cy.openSourceCode();
    cy.checkCodeSpanLine('disabled: true', 0);
  });
});
