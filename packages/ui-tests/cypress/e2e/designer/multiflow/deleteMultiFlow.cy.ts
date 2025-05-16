describe('Test for deleting multiple routes action using the route filter', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User filters and deletes single flow, exactly matching specified name', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.openFlowsListIfClosed();

    cy.get('.pf-v6-c-text-input-group__text-input').clear().type('route-1234');
    cy.get('[data-testid="delete-filtered-btn"]').click();
    cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '2/2');
  });

  it('User filters and deletes two flows, containing specified string', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.openFlowsListIfClosed();

    cy.get('.pf-v6-c-text-input-group__text-input').clear().type('4');
    cy.get('[data-testid="delete-filtered-btn"]').click();
    cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '1/1');
  });

  it('User deletes all three flows, not utilizing the route filter', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.openFlowsListIfClosed();

    cy.get('[data-testid="delete-filtered-btn"]').click();
    cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();

    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '0/0');
  });
});
