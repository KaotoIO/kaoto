describe('Test for Multi route actions from the code editor', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User deletes first route from multi-route using code editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/2');

    cy.openSourceCode();
    cy.editorDeleteLine(21, 12);
    cy.openDesignPage();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/1');
  });

  it('User adds new route to Camel multi-route using code editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');

    const stepToInsert = `- route:
      id: route-new
      from:
        uri: null
        steps: []`;

    cy.editorAddText(23, stepToInsert);
    cy.openDesignPage();

    // CHECK that the route ID is shown in the
    cy.get('[data-testid="flows-list-dropdown"]').click();
    cy.get('[data-testid="flows-list-table"] [data-testid="goto-btn-route-new"]').should('be.visible');
    cy.get('[data-testid="flows-list-dropdown"]').click();
    cy.showAllRoutes();

    // CHECK the new empty route was added
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '3/3');
    cy.get('g[data-layer-id="default"]').should('exist').contains('from: Unknown');
  });

  it('User deletes second route from multi-route using code editor', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');

    cy.editorDeleteLine(11, 11);
    cy.openDesignPage();

    cy.showAllRoutes();
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/1');
  });

  it('User deletes step from first route using code editor', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');

    cy.editorDeleteLine(7, 4);
    cy.openDesignPage();
    cy.showAllRoutes();
    /** We check how many nodes are remaining */
    cy.checkNodeExist('log', 1);
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '2/2');
  });

  it('User adds step to the first route using code editor', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    const stepToInsert = `        - setHeader:
            constant: test`;
    cy.editorAddText(9, stepToInsert);
    cy.openDesignPage();

    // CHECK the set-header step was added
    cy.checkNodeExist('setHeader', 1);
  });

  it('User adds step to the second route using code editor', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    const stepToInsert = `        - setBody:
          constant: test`;
    cy.editorAddText(20, stepToInsert);

    cy.openDesignPage();
    cy.showAllRoutes();
    // CHECK the insert-field-action step was added
    cy.checkNodeExist('setBody', 1);
  });
});
