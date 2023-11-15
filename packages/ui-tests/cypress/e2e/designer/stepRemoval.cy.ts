describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - remove steps from CamelRoute', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();
    cy.removeNodeByName('setHeader');
    cy.removeNodeByName('log');
    cy.removeNodeByName('timer');
    cy.checkNodeExist('from: Unknown', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: timer:test', 0);
    cy.checkCodeSpanLine('setHeader', 0);
    cy.checkCodeSpanLine('constant: test', 0);
    cy.checkCodeSpanLine('name: test', 0);
    cy.checkCodeSpanLine('uri: log:test', 0);
  });

  it('Design - remove steps from Pipe/KB', () => {
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
    cy.openDesignPage();
    cy.removeNodeByName('json-deserialize-action');
    cy.removeNodeByName('kafka-source');
    cy.removeNodeByName('kafka-sink');
    cy.checkNodeExist('source: Unknown', 1);
    cy.checkNodeExist('sink: Unknown', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('json-deserialize-action', 0);
    cy.checkCodeSpanLine('kafka-source', 0);
    cy.checkCodeSpanLine('kafka-sink', 0);
    cy.checkCodeSpanLine('source: {}', 1);
    cy.checkCodeSpanLine('sink: {}', 1);
  });
});
