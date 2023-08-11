describe('Catalog', () => {
  beforeEach(() => {
    const url: string | null = Cypress.config().baseUrl;
    cy.visit(url!);
  });

  it('Catalog search', () => {
    cy.get('[data-testid="Catalog"]').click();
    cy.get('[data-testid="Component-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('timer');
    cy.get('div[id="timer"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();

    cy.get('[data-testid="Processor-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('choice');
    cy.get('div[id="choice"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();

    cy.get('[data-testid="Kamelet-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('google');
    cy.get('div[id="google-storage-source"]').should('be.visible');
  });
});
