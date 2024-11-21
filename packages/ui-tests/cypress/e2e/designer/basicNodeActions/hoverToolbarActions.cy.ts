describe('Test toolbar on hover actions', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Replace steps in using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');

    cy.get('[data-testid="step-toolbar-button-replace"]').click();
    cy.chooseFromCatalog('component', 'quartz');

    cy.checkNodeExist('quartz', 1);
  });

  it('Delete steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');

    cy.get('[data-testid="step-toolbar-button-delete"]').click();

    cy.checkNodeExist('setHeader', 0);
  });

  it('Disable and Enable steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.get('[data-testid="step-toolbar-button-disable"]').click();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.openStepConfigurationTab('setHeader');
    cy.get('[data-testid="step-toolbar-button-disable"]').click();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.checkConfigCheckboxObject('disabled', false);
  });

  it('Delete route using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('camel-route');

    cy.get('[data-testid="step-toolbar-button-delete-group"]').click();
    cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();

    cy.get('[data-testid^="rf__node-node_0"]').should('have.length', 0);

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '0/0');
    cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
  });

  it('Add branch using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('choice');

    cy.get('[data-testid="step-toolbar-button-add-special"]').click();

    cy.chooseFromCatalog('processor', 'when');
    cy.checkNodeExist('when', 4);
    cy.checkNodeExist('log', 2);
  });

  it('Collapse and unwrap container using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('choice');

    cy.get(`[data-testid="step-toolbar-button-collapse"]`).click({ force: true });
    cy.checkNodeExist('when', 0);
    cy.checkNodeExist('otherwise', 0);
    cy.checkNodeExist('log', 0);

    cy.get(`[data-testid="step-toolbar-button-collapse"]`).click({ force: true });
    cy.checkNodeExist('when', 3);
    cy.checkNodeExist('otherwise', 1);
    cy.checkNodeExist('log', 1);
  });
});
