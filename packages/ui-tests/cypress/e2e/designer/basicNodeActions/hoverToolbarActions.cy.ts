describe('Test toolbar on hover actions', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Replace steps in using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');

    cy.get('[data-testid="timer|step-toolbar-button-replace"]').click();
    cy.chooseFromCatalog('component', 'quartz');

    cy.checkNodeExist('quartz', 1);
  });

  it('Delete steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');

    cy.get('[data-testid="setHeader|step-toolbar-button-delete"]').click();

    cy.checkNodeExist('setHeader', 0);
  });

  it('Disable and Enable steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.get('[data-testid="setHeader|step-toolbar-button-disable"]').click();

    cy.openStepConfigurationTab('setHeader');

    cy.selectFormTab('All');
    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.get('[data-testid="setHeader|step-toolbar-button-disable"]').click();

    cy.openStepConfigurationTab('setHeader');

    cy.expandWrappedSection('#-Advanced');
    cy.checkConfigCheckboxObject('disabled', false);
  });

  it('Delete route using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('camel-route');

    cy.get('[data-testid="camel-route|step-toolbar-button-delete-group"]').click();
    cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();

    cy.get('[data-testid^="rf__node-node_0"]').should('have.length', 0);

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '0/0');
    cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
  });

  it('Add branch using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('choice');

    cy.get('[data-testid="choice|step-toolbar-button-add-special"]').click();

    cy.chooseFromCatalog('processor', 'when');
    cy.checkNodeExist('when', 6);
    cy.checkNodeExist('log', 2);
  });

  it('Collapse and unwrap container using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('choice');

    cy.get(`[data-testid="choice|step-toolbar-button-collapse"]`).click();
    cy.checkNodeExist('when', 0);
    cy.checkNodeExist('otherwise', 0);
    cy.checkNodeExist('log', 0);

    cy.get(`[data-testid="choice|step-toolbar-button-collapse"]`).click();
    cy.checkNodeExist('when', 5);
    cy.checkNodeExist('otherwise', 2);
    cy.checkNodeExist('log', 1);
  });

  it('Keep group collapsed after the change in the route', () => {
    cy.uploadFixture('flows/camelRoute/complex.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('choice');

    cy.get(`[data-testid="choice|step-toolbar-button-collapse"]`).click();
    cy.checkNodeExist('when', 0);
    cy.checkNodeExist('otherwise', 0);

    cy.selectReplaceNode('timer');
    cy.chooseFromCatalog('component', 'aws2-s3');

    cy.checkNodeExist('aws2-s3', 1);
    cy.checkNodeExist('timer', 0);

    cy.checkNodeExist('when', 0);
    cy.checkNodeExist('otherwise', 0);
  });

  it('Keep the selected route collapsed after switching tabs', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();

    cy.toggleExpandGroup('route-1234');
    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);

    cy.openSourceCode();
    cy.openDesignPage();

    cy.get('span[title="route-1234"]').should('be.visible').click();
    cy.get('[data-testid="route-1234|step-toolbar-button-collapse"]').should('have.attr', 'title', 'Expand step');

    cy.openGroupConfigurationTab('route-4321');
    cy.get('[data-testid="route-4321|step-toolbar-button-collapse"]').should('have.attr', 'title', 'Collapse step');

    cy.selectAppendNode('log');
    cy.chooseFromCatalog('component', 'activemq');

    cy.get('span[title="route-1234"]').should('be.visible').click();
    cy.get('[data-testid="route-1234|step-toolbar-button-collapse"]').should('have.attr', 'title', 'Expand step');

    cy.openGroupConfigurationTab('route-4321');
    cy.get('[data-testid="route-4321|step-toolbar-button-collapse"]').should('have.attr', 'title', 'Collapse step');

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);
    cy.checkNodeExist('activemq', 1);
  });
});
