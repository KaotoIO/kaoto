// cy.type() has no {f10} sequence, so dispatch the key event on the focused element
const pressShiftF10 = () => {
  cy.focused().then(($element) => {
    $element[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', code: 'F10', shiftKey: true, bubbles: true, cancelable: true }),
    );
  });
};

describe('Canvas context menus with the keyboard', () => {
  beforeEach(() => {
    cy.openHomePageWithPreExistingRoutes();
  });

  it('hides, shows and creates routes using only the keyboard', () => {
    // Stands in for Tab navigation to the canvas
    cy.get('[data-id="route-1234|route.from"]').should('be.visible');
    cy.get('#canvas-main').focus();
    cy.get('#canvas-main').should('be.focused');

    pressShiftF10();
    cy.get('[role="menu"][aria-label="Canvas actions"]').should('be.visible');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain.text', 'Show all');

    cy.focused().type('{downArrow}');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain.text', 'Hide all');
    cy.focused().type('{enter}');

    cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
    cy.get('#canvas-main').should('be.focused');

    pressShiftF10();
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain.text', 'Show all');
    // Show all, Hide all, (disabled Paste is skipped), New
    cy.focused().type('{downArrow}{downArrow}');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain.text', 'New');
    cy.focused().type('{rightArrow}');
    cy.focused().should('have.attr', 'role', 'menuitem').and('contain.text', 'Route');
    cy.focused().type('{enter}');

    cy.get('[data-kind="node"][data-id*="route"]').should('be.visible');
    cy.get('[data-testid="visualization-empty-state"]').should('not.exist');
    cy.get('#canvas-main').should('be.focused');

    // Stands in for arrow navigation to the step
    const logStep = '[data-id$="steps.0.log"] > g.custom-node';
    cy.get(logStep).first().focus();
    pressShiftF10();
    cy.get('[role="menu"][aria-label="Step actions"]').should('be.visible');
    cy.focused().type('{esc}');
    cy.get('[role="menu"]').should('not.exist');
    cy.get(logStep).first().should('be.focused');
  });
});
