describe('Tests for side panel step filtering', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Side panel step filtering lowercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`.expression-metadata-editor`).should('exist');
    cy.get('.pf-v5-c-card__header-toggle').click();

    // filter fields
    cy.filterFields('name');
    cy.get(`.expression-metadata-editor`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="disabled"]`).should('not.exist');
  });

  it('Side panel step filtering uppercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');

    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`.expression-metadata-editor`).should('exist');
    cy.get('.pf-v5-c-card__header-toggle').click();

    // filter fields
    cy.filterFields('DISABLED');
    cy.get(`.expression-metadata-editor`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`input[name="name"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });
  // reproducer for https://github.com/KaotoIO/kaoto/issues/1207
  it('Side panel step filtering multiple words', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');

    // filter fields
    cy.filterFields('show all');
    cy.get(`input[name="parameters.showAll"]`).should('exist');
    cy.get(`input[name="parameters.showAllProperties"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });

  it('Side panel all fields / user modified filter', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('variableSend', 'testVariableSend');
    cy.interactWithConfigInputObject('variableReceive', 'testVariableReceive');

    cy.selectFormTab('Modified');

    cy.get(`input[name="variableSend"]`).should('exist');
    cy.get(`input[name="variableReceive"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');

    cy.selectFormTab('All');

    cy.get(`input[name="variableSend"]`).should('exist');
    cy.get(`input[name="variableReceive"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="id"]`).should('exist');
  });
});
