describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - add steps to CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
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
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
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

  it('Design - add steps to CamelRoute using the quick append icon', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('log');
    cy.quickAppendStep('route.from.steps.3.placeholder');
    cy.chooseFromCatalog('processor', 'choice');

    cy.openGroupConfigurationTab('choice');
    cy.quickAppendStep('route.from.steps.4.placeholder');
    cy.chooseFromCatalog('component', 'as2');

    cy.openStepConfigurationTab('as2');
    cy.quickAppendStep('route.from.steps.5.placeholder');
    cy.chooseFromCatalog('component', 'amqp');

    cy.openSourceCode();
    cy.checkCodeSpanLine('choice:', 1);
    cy.checkCodeSpanLine('uri: amqp', 1);
    cy.checkCodeSpanLine('uri: as2', 1);
  });
});
