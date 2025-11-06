describe('Tests for Design page', { browser: '!firefox' }, () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.allowClipboardAccess();
  });

  it('Design - Paste steps across CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/complexMultiFlow.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('when-setHeader');
    cy.selectPasteNode('Choice-route-2', 'paste-as-special-child');
    cy.checkNodeExist('when-setHeader', 2);

    cy.openSourceCode();
    cy.editorScrollToMiddle();

    cy.checkMultipleCodeSpanEntry('- description: when-setHeader', 2);
  });

  it('Design - Paste steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('log');
    cy.selectPasteNode('timer', 'paste-as-child');
    cy.checkNodeExist('log', 2);

    cy.selectCopyNode('setHeader');
    cy.selectPasteNode('marshal', 'paste-as-next-step');

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('uri: log:test', 2);
  });

  it('Design - Paste steps in Pipe/KB', () => {
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('delay-action');
    cy.selectPasteNode('delay-action', 'paste-as-next-step');
    cy.checkNodeExist('delay-action', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('name: delay-action', 2);
  });

  it('Design - Copy/paste steps across Kamelets-routes', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('setBody');

    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectPasteNode('marshal', 'paste-as-next-step');
    cy.checkNodeExist('setBody', 1);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkCodeSpanLine('- setBody:', 1);
  });

  it('Design - Paste intercept in RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfigurationAndIntercept.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('intercept-test');
    cy.selectPasteNode('routeConfiguration-test', 'paste-as-special-child');
    cy.checkNodeExist('intercept-test', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('- intercept:', 2);
  });

  it('Design - Paste steps in CamelRoute by adding something to the clipboad', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.addValueToClipboard({
      type: 'Route',
      name: 'to',
      definition: { id: 'to-1913', uri: 'amqp', parameters: {} },
      __kaoto_marker: 'kaoto-node',
    });

    cy.selectPasteNode('marshal', 'paste-as-next-step');
    cy.checkNodeExist('amqp', 1);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkCodeSpanLine('uri: amqp', 1);
  });
});
