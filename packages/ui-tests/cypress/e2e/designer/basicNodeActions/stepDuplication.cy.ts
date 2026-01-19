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
    cy.getMonacoValue().then(({ sourceCode }) => {
      const uriMatches = sourceCode.match(/uri: timer/g) ?? [];
      expect(uriMatches).to.have.lengthOf(1);

      const setHeaderMatches = sourceCode.match(/setHeader/g) ?? [];
      expect(setHeaderMatches).to.have.lengthOf(0);

      const constantMatches = sourceCode.match(/constant: test/g) ?? [];
      expect(constantMatches).to.have.lengthOf(0);

      const nameMatches = sourceCode.match(/name: test/g) ?? [];
      expect(nameMatches).to.have.lengthOf(0);

      const marshalMatches = sourceCode.match(/- marshal:/g) ?? [];
      expect(marshalMatches).to.have.lengthOf(2);

      const whenMatches = sourceCode.match(/id: when/g) ?? [];
      expect(whenMatches).to.have.lengthOf(2);
    });
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
    cy.getMonacoValue().then(({ sourceCode }) => {
      const interceptMatches = sourceCode.match(/- intercept:/g) ?? [];
      expect(interceptMatches).to.have.lengthOf(2);

      const interceptFromMatches = sourceCode.match(/- interceptFrom:/g) ?? [];
      expect(interceptFromMatches).to.have.lengthOf(2);

      const interceptSendToEndpointMatches = sourceCode.match(/- interceptSendToEndpoint:/g) ?? [];
      expect(interceptSendToEndpointMatches).to.have.lengthOf(2);
    });
  });

  it('Design - duplicate RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfiguration.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('routeConfiguration');
    cy.checkNodeExist('routeConfiguration', 2);

    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const routeConfigurationMatches = sourceCode.match(/- routeConfiguration:/g) ?? [];
      expect(routeConfigurationMatches).to.have.lengthOf(2);
    });
  });

  it('Design - duplicate steps in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('marshal');
    cy.checkNodeExist('marshal', 2);

    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const marshalMatches = sourceCode.match(/- marshal:/g) ?? [];
      expect(marshalMatches).to.have.lengthOf(2);
    });
  });

  it('Design - duplicate steps in Pipe', () => {
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('json-deserialize-action');
    cy.checkNodeExist('json-deserialize-action', 2);

    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const jsonDeserializeMatches = sourceCode.match(/json-deserialize-action/g) ?? [];
      expect(jsonDeserializeMatches).to.have.lengthOf(2);

      const kafkaSourceMatches = sourceCode.match(/kafka-source/g) ?? [];
      expect(kafkaSourceMatches).to.have.lengthOf(1);

      const kafkaSinkMatches = sourceCode.match(/kafka-sink/g) ?? [];
      expect(kafkaSinkMatches).to.have.lengthOf(1);
    });
  });
});
