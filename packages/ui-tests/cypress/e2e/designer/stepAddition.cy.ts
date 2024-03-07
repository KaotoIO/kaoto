describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - add steps to CamelRoute', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'as2');
    cy.checkNodeExist('as2', 1);

    cy.selectPrependNode('setHeader');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: as2', 1);
    cy.checkCodeSpanLine('log', 1);
  });

  it('Design - add steps to Pipe/KB', () => {
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('json-deserialize-action');
    cy.chooseFromCatalog('kamelet', 'log-action');
    cy.checkNodeExist('log-action', 1);

    cy.selectPrependNode('json-deserialize-action');
    cy.chooseFromCatalog('kamelet', 'string-template-action');
    cy.checkNodeExist('string-template-action', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('log-action', 1);
    cy.checkCodeSpanLine('string-template-action', 1);
  });
});
