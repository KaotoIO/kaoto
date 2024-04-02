describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - replace steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('timer');
    cy.chooseFromCatalog('component', 'aws2-s3');

    cy.checkNodeExist('aws2-s3', 1);
    cy.checkNodeExist('timer', 0);

    cy.selectReplaceNode('setHeader');
    cy.chooseFromCatalog('processor', 'setBody');

    cy.checkNodeExist('setBody', 1);
    cy.checkNodeExist('setHeader', 0);

    cy.selectReplaceNode('log');
    cy.chooseFromCatalog('component', 'dropbox');

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

  it('Design - replace steps in Pipe/KB', () => {
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('kafka-source');
    cy.chooseFromCatalog('kamelet', 'aws-s3-cdc-source');

    cy.checkNodeExist('aws-s3-cdc-source', 1);
    cy.checkNodeExist('kafka-source', 0);

    cy.selectReplaceNode('json-deserialize-action');
    cy.chooseFromCatalog('kamelet', 'log-action');

    cy.checkNodeExist('log-action', 1);
    cy.checkNodeExist('json-deserialize-action', 0);

    cy.selectReplaceNode('kafka-sink');
    cy.chooseFromCatalog('kamelet', 'dropbox-sink');

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
