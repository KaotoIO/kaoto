describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - add steps to CamelRoute', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('setHeader');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('as2');
    cy.get('#as2').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('as2', 1);

    cy.selectPrependNode('setHeader');
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('log');
    cy.get('#log').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: as2', 1);
    cy.checkCodeSpanLine('log', 1);
  });

  it('Design - add steps to Pipe/KB', () => {
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('json-deserialize-action');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('log-action');
    cy.get('#log-action').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('log-action', 1);

    cy.selectPrependNode('json-deserialize-action');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('string-template-action');
    cy.get('#string-template-action').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('string-template-action', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('log-action', 1);
    cy.checkCodeSpanLine('string-template-action', 1);
  });
});
