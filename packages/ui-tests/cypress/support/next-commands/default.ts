Cypress.Commands.add('openHomePage', () => {
  const url = Cypress.config().baseUrl;
  cy.visit(url!);
  cy.get('[data-kind="graph"]').should('exist');
  // Wait for the element to become visible
  cy.get('[data-kind="graph"]').should('be.visible');
});

Cypress.Commands.add('expandVisualization', () => {
  cy.get('#Visualization').each(($element) => {
    const attributeValue = $element.attr('aria-expanded');
    if (attributeValue === 'false') {
      cy.wrap($element).click();
    }
  });
});

Cypress.Commands.add('openDesignPage', () => {
  cy.expandVisualization();
  cy.get('[data-testid="Design"]').click();
  cy.get('[data-test-id="topology"]').should('be.visible');
});

Cypress.Commands.add('openSourceCode', () => {
  cy.expandVisualization();
  cy.get('[data-testid="Source Code"]').click();
  cy.get('.pf-v5-c-code-editor__code').should('be.visible');
});

Cypress.Commands.add('openBeans', () => {
  cy.get('[data-testid="Beans"]').click();
  cy.get('.metadataEditorModalDetailsView').should('be.visible');
});

Cypress.Commands.add('openCatalog', () => {
  cy.get('[data-testid="Catalog"]').click();
  cy.get('[data-testid="Component-catalog-tab"]').should('be.visible');
});
