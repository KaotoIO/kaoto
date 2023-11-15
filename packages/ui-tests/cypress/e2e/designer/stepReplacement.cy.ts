describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - remove steps from CamelRoute', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('timer');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('aws s3 storage service');
    cy.get('#aws2-s3').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('aws2-s3', 1);
    cy.checkNodeExist('timer', 0);

    cy.selectReplaceNode('setHeader');
    cy.get('[data-testid="model-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('setBody');
    cy.get('#setBody').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('setBody', 1);
    cy.checkNodeExist('setHeader', 0);

    cy.selectReplaceNode('log');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('dropbox');
    cy.get('#dropbox').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('dropbox', 1);
    cy.checkNodeExist('log', 0);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: timer', 0);
    cy.checkCodeSpanLine('setHeader', 0);
    cy.checkCodeSpanLine('constant: test', 0);
    cy.checkCodeSpanLine('name: test', 0);
    cy.checkCodeSpanLine('uri: aws2-s3', 1);
    cy.checkCodeSpanLine('setBody', 1);
    cy.checkCodeSpanLine('uri: dropbox', 1);
  });

  it('Design - remove steps from Pipe/KB', () => {
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('kafka-source');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('aws-s3-cdc-source');
    cy.get('#aws-s3-cdc-source').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('aws-s3-cdc-source', 1);
    cy.checkNodeExist('kafka-source', 0);

    cy.selectReplaceNode('json-deserialize-action');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('log action');
    cy.get('#log-action').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('log-action', 1);
    cy.checkNodeExist('json-deserialize-action', 0);

    cy.selectReplaceNode('kafka-sink');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('dropbox sink');
    cy.get('#dropbox-sink').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);
    cy.checkNodeExist('dropbox-sink', 1);
    cy.checkNodeExist('kafka-sink', 0);

    cy.openSourceCode();
    cy.checkCodeSpanLine('json-deserialize-action', 0);
    cy.checkCodeSpanLine('kafka-source', 0);
    cy.checkCodeSpanLine('kafka-sink', 0);
    cy.checkCodeSpanLine('aws-s3-cdc-source', 1);
    cy.checkCodeSpanLine('log-action', 1);
    cy.checkCodeSpanLine('dropbox-sink', 1);
  });
});
