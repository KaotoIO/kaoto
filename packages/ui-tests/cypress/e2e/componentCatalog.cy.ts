describe('Catalog related tests', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Catalog search', () => {
    cy.openCatalog();
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('[data-testid="kamelet-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('timer');
    cy.get('div[id="timer"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').should('have.value', '');

    cy.get('[data-testid="component-catalog-tab"]').click();
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('choice');
    cy.get('div[id="choice"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').should('have.value', '');

    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('[data-testid="kamelet-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('aws secret');
    cy.get('div[id="aws-secrets-manager-sink"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').should('have.value', '');
  });

  it('Catalog filtering using tags', () => {
    cy.openCatalog();
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('[data-testid="kamelet-catalog-tab"]').click();
    cy.get('[data-testid="tag-cloud"]').first().click();
    cy.get('[data-testid="tag-database"]').first().click();
    cy.get('[data-testid="tag-serverless"]').first().click();

    cy.get('[data-testid="tile-aws2-redshift-data"]').should('be.visible');

    cy.get('[data-testid="button-catalog-tag-cloud"]').click();
    cy.get('[data-testid="button-catalog-tag-database"]').click();
    cy.get('[data-testid="button-catalog-tag-serverless"]').click();
    cy.contains('h2', 'Showing 1 elements').should('not.exist');
  });

  it('Catalog list view switch check', () => {
    cy.openCatalog();
    cy.get('#toggle-layout-button-List').click();
    cy.get('[data-testid="component-catalog-tab"]').click();
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('#toggle-layout-button-Gallery').should('have.attr', 'aria-pressed', 'false');
    cy.openSourceCode();
    cy.openCatalog();
    cy.get('#toggle-layout-button-Gallery').should('have.attr', 'aria-pressed', 'false');
    cy.get('#toggle-layout-button-Gallery').click();
    cy.get('[data-testid="processor-catalog-tab"]').click({ force: true });
    cy.get('[data-testid="kamelet-catalog-tab"]').click({ force: true });
    cy.get('#toggle-layout-button-Gallery').should('have.attr', 'aria-pressed', 'true');
  });
});
