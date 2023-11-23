Cypress.Commands.add('openHomePage', () => {
  const url = Cypress.config().baseUrl;
  cy.visit(url!);
  // Wait for the loading schemas to disappear
  cy.get('[data-testid="loading-schemas"]').should('be.visible');
  cy.get('[data-testid="loading-schemas"]').should('not.exist');
  // Wait for the loading connectors to disappear
  cy.get('[data-testid="loading-catalogs"]').should('be.visible');
  cy.get('[data-testid="loading-catalogs"]').should('not.exist');

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
  cy.get('.metadata-editor-modal-details-view').should('be.visible');
});

Cypress.Commands.add('openMetadata', () => {
  cy.get('[data-testid="Metadata"]').click();
  cy.get('[data-testid="metadata-editor-form-Metadata"]').should('be.visible');
});

Cypress.Commands.add('openPipeErrorHandler', () => {
  cy.get('[data-testid="Pipe ErrorHandler"]').click();
  cy.get('h1.pf-v5-c-title').should('contain.text', 'Pipe ErrorHandler Configuration');
});

Cypress.Commands.add('openCatalog', () => {
  cy.get('[data-testid="Catalog"]').click();
  cy.get('[data-testid="component-catalog-tab"]').should('be.visible');
});
