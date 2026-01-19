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

    cy.getMonacoValue().then(({ sourceCode }) => {
      const descriptionMatches = sourceCode.match(/- description: when-setHeader/g) ?? [];
      expect(descriptionMatches).to.have.lengthOf(2);
    });
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
    cy.getMonacoValue().then(({ sourceCode }) => {
      const uriMatches = sourceCode.match(/uri: log:test/g) ?? [];
      expect(uriMatches).to.have.lengthOf(2);
    });
  });

  it('Design - Paste steps in Pipe/KB', () => {
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('delay-action');
    cy.selectPasteNode('delay-action', 'paste-as-next-step');
    cy.checkNodeExist('delay-action', 2);

    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const nameMatches = sourceCode.match(/name: delay-action/g) ?? [];
      expect(nameMatches).to.have.lengthOf(2);
    });
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
    cy.getMonacoValue().then(({ sourceCode }) => {
      const setBodyMatches = sourceCode.match(/- setBody:/g) ?? [];
      expect(setBodyMatches).to.have.lengthOf(1);
    });
  });

  it('Design - Paste intercept in RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfigurationAndIntercept.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('intercept-test');
    cy.selectPasteNode('routeConfiguration-test', 'paste-as-special-child');
    cy.checkNodeExist('intercept-test', 2);

    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const interceptMatches = sourceCode.match(/- intercept:/g) ?? [];
      expect(interceptMatches).to.have.lengthOf(2);
    });
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
    cy.checkCodeSpanLine('uri: amqp', 1);
    cy.getMonacoValue().then(({ sourceCode }) => {
      const uriMatches = sourceCode.match(/uri: amqp/g) ?? [];
      expect(uriMatches).to.have.lengthOf(1);
    });
  });
});
