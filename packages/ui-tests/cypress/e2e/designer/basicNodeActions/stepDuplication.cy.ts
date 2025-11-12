describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - duplicate steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('log');
    cy.chooseFromCatalog('processor', 'doTry');

    cy.checkNodeExist('doTry', 1);
    cy.checkNodeExist('doCatch', 1);
    cy.checkNodeExist('doFinally', 1);
    cy.selectDuplicateNode('doCatch');

    cy.selectDuplicateNode('marshal');
    cy.checkNodeExist('marshal', 2);

    cy.selectReplaceNode('setHeader');
    cy.chooseFromCatalog('processor', 'choice');

    cy.checkNodeExist('choice', 1);
    cy.checkNodeExist('when', 1);
    cy.checkNodeExist('otherwise', 1);
    cy.checkNodeExist('setHeader', 0);

    cy.selectDuplicateNode('when');
    cy.checkNodeExist('when', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkCodeSpanLine('uri: timer', 1);
    cy.checkCodeSpanLine('setHeader', 0);
    cy.checkCodeSpanLine('constant: test', 0);
    cy.checkCodeSpanLine('name: test', 0);
    cy.checkMultipleCodeSpanEntry('- marshal:', 2);
    cy.checkMultipleCodeSpanEntry('id: when', 2);
  });

  it('Design - duplicate nodes in RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfiguration.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('intercept');
    cy.checkNodeExist('intercept', 2);

    cy.selectDuplicateNode('interceptFrom');
    cy.checkNodeExist('interceptFrom', 2);

    cy.selectDuplicateNode('interceptSendToEndpoint');
    cy.checkNodeExist('interceptSendToEndpoint', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('- intercept:', 2);
    cy.checkMultipleCodeSpanEntry('- interceptFrom:', 2);
    cy.checkMultipleCodeSpanEntry('- interceptSendToEndpoint:', 2);
  });

  it('Design - duplicate RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfiguration.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('routeConfiguration');
    cy.checkNodeExist('routeConfiguration', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('- routeConfiguration:', 2);
  });

  it('Design - duplicate steps in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('marshal');
    cy.checkNodeExist('marshal', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('- marshal:', 2);
  });

  it('Design - duplicate steps in Pipe', () => {
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('json-deserialize-action');
    cy.checkNodeExist('json-deserialize-action', 2);

    cy.openSourceCode();
    cy.checkMultipleCodeSpanEntry('json-deserialize-action', 2);
    cy.checkCodeSpanLine('kafka-source', 1);
    cy.checkCodeSpanLine('kafka-sink', 1);
  });
});
