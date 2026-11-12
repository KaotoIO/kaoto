describe('Canvas background click', () => {
  beforeEach(() => {
    cy.openHomePageWithPreExistingRoutes();
  });

  it('closes the properties and keeps focus on the selected step of its own route', () => {
    // Both routes contain a log step with the same path; only the topology id differs
    const secondTimer = '[data-id="route-4321|route.from"] > g.custom-node';
    const secondLog = '[data-id="route-4321|route.from.steps.0.log"] > g.custom-node';

    cy.get(secondLog).click();
    cy.get('[data-testid="close-side-bar"]').should('be.visible');

    for (let click = 0; click < 3; click++) {
      // An empty spot inside the fit padding of the drawing surface
      cy.get('[data-kind="graph"] > rect').click(10, 10);
      cy.get('[data-testid="close-side-bar"]').should('not.exist');
      cy.get(secondLog).should('be.focused');
    }

    // Keyboard navigation continues from the focused step
    cy.focused().type('{leftArrow}');
    cy.get(secondTimer).should('be.focused');
  });
});
