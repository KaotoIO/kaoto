describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - move steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/complex.yaml');
    cy.openDesignPage();

    cy.selectMoveAfterNode('choice');
    cy.selectMoveBeforeNode('when-log');

    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/complex-moved.yaml');
  });

  it('Design - move nodes in RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfigurationComplex.yaml');
    cy.openDesignPage();

    cy.selectMoveAfterNode('intercept-amqp');
    cy.selectMoveBeforeNode('intercept-amqp');

    cy.selectMoveBeforeNode('interceptFrom-log');
    cy.selectMoveAfterNode('interceptFrom-log');

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.compareFileWithMonacoEditor('flows/camelRoute/routeConfigurationComplex.yaml');
  });

  it('Design - move steps in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectMoveBeforeNode('marshal');
    cy.selectMoveAfterNode('marshal');

    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/kamelet/basic.yaml');
  });

  it('Design - move steps in Pipe', () => {
    cy.uploadFixture('flows/pipe/pipeWithSteps.yaml');
    cy.openDesignPage();

    cy.selectMoveBeforeNode('avro-deserialize-action');
    cy.selectMoveAfterNode('avro-deserialize-action');

    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/pipe/pipeWithSteps.yaml');
  });
});
