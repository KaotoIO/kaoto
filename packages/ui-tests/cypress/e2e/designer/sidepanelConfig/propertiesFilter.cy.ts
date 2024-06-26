describe('Tests for side panel step filtering', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Side panel step filtering lowercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');

    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`input[data-testid="expression-preview-input"]`).should('exist');

    // filter fields
    cy.filterFields('name');
    cy.get(`input[data-testid="expression-preview-input"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="disabled"]`).should('not.exist');
  });

  it('Side panel step filtering uppercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');

    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`input[data-testid="expression-preview-input"]`).should('exist');

    // filter fields
    cy.filterFields('DISABLED');
    cy.get(`input[data-testid="expression-preview-input"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`input[name="name"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });

  // blocked by https://github.com/KaotoIO/kaoto/issues/1207
  it.skip('Side panel step filtering multiple words', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');

    // filter fields
    cy.filterFields('show all');
    cy.get(`input[name="showAll"]`).should('exist');
    cy.get(`input[name="showAllProperties"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });
});
