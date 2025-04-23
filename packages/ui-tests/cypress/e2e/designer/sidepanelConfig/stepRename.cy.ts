describe('Tests for step renaming using sidebar config', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Check the sync between the canvas nodes description/id and form changes', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.checkNodeExist('testDescription', 1);
    cy.interactWithConfigInputObject('description', 'newTestDescription');
    cy.checkNodeExist('newTestDescription', 1);

    cy.openSettings();
    cy.selectInTypeaheadField('nodeLabel', 'id');
    cy.get('[data-testid="settings-form-save-btn"]').click();
    cy.waitSchemasLoading();
    cy.openDesignPage();

    cy.openStepConfigurationTab('newTestDescription');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('id', 'testId');
    cy.checkNodeExist('testId', 1);
  });
});
