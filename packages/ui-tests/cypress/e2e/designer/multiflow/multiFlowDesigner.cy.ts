describe('Test for Multi route actions from the canvas', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User changes route type in the canvas', () => {
    cy.switchIntegrationType('Kamelet');
    cy.get('[data-testid="dsl-list-dropdown"]').contains('Kamelet');
    cy.switchIntegrationType('camelYamlDsl');
    cy.get('[data-testid="dsl-list-dropdown"]').contains('Camel Route');
    cy.switchIntegrationType('Pipe');
    cy.get('[data-testid="dsl-list-dropdown"]').contains('Pipe');
  });

  it('User shows and hides a route', () => {
    cy.addNewRoute();
    cy.addNewRoute();
    cy.addNewRoute();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/3');

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '3/3');

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);
    cy.toggleRouteVisibility(2);

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '0/3');
  });

  it('User renames routes', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/2');
    cy.get('[data-testid="flows-list-dropdown"]').click();

    cy.get('[data-testid=goto-btn-route-1234--edit]').click();
    cy.get('[data-testid=goto-btn-route-1234--text-input]').dblclick();
    cy.get('[data-testid=goto-btn-route-1234--text-input]').clear().type('route-4321');
    cy.get('.pf-v5-c-helper-text__item-text').should('have.text', 'Name must be unique');
    cy.get('[data-testid="goto-btn-route-1234--text-input"]').dblclick();
    cy.get('[data-testid="goto-btn-route-1234--text-input"]').clear().type('test 2');
    cy.get('.pf-v5-c-helper-text__item-text').should(
      'have.text',
      'Name should only contain lowercase letters, numbers, and dashes',
    );
    cy.get('[data-testid="goto-btn-route-1234--text-input"]').dblclick();
    cy.get('[data-testid="goto-btn-route-1234--text-input"]').clear().type('test3');
    cy.get('[data-testid="goto-btn-route-1234--save"]').click();

    cy.openSourceCode();
    cy.checkCodeSpanLine('id: test3');
    cy.checkCodeSpanLine('id: route-1234', 0);
  });

  it('User deletes routes in the canvas till there are no routes', () => {
    cy.openDesignPage();
    cy.addNewRoute();
    cy.addNewRoute();
    cy.addNewRoute();
    cy.showAllRoutes();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '3/3');

    cy.cancelDeleteRoute(0);
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '3/3');

    cy.deleteRoute(0);
    cy.deleteRoute(0);
    cy.deleteRoute(0);

    cy.toggleFlowsList();

    cy.get('[data-testid^="rf__node-node_0"]').should('have.length', 0);

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '0/0');
    cy.get('#flows-list-select').within(() => {
      cy.get('h4.pf-v5-c-empty-state__title-text').should('have.text', "There's no routes to show");
    });

    cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
  });

  const testData = ['Pipe', 'Kamelet'];
  // Iterate over testData
  testData.forEach((data) => {
    it("User can't create multiple routes in canvas of type " + data, () => {
      cy.switchIntegrationType(data);
      cy.get('[data-testid="dsl-list-dropdown"]').click({ force: true });
      cy.get('.pf-v5-c-menu__item-text').contains(data).closest('button').should('be.disabled');
      cy.get('[data-testid="new-entity-list-dropdown"]').should('not.exist');

      cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/1');
    });
  });

  it('User creates multiple CamelRoute type routes in canvas', () => {
    // Camel Route is set as default type - simply add new routes
    cy.addNewRoute();
    cy.addNewRoute();
    cy.addNewRoute();

    cy.showAllRoutes();
    /** We check how many nodes are remaining */
    cy.checkNodeExist('log', 3);
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '3/3');
  });
});
