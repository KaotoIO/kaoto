describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - remove steps from CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
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
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
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

  it('In an integration with at least two steps, user deletes the first step, showing a placeholder step in its place (start-end)', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.removeNodeByName('timer');
    cy.checkNodeExist('from: Unknown', 1);
    cy.checkNodeExist('setHeader', 1);
    cy.checkNodeExist('log', 1);

    // CHECK that the step is deleted
    cy.get('[data-id^="timer"]').should('not.exist');

    cy.openSourceCode();
    // CHECK that YAML not contains the 'timer:test'
    cy.checkCodeSpanLine('timer:test', 0);
  });

  it('Step detail - User deletes a step, which closes the detail drawer', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('log');
    cy.get('.pf-topology-side-bar').should('be.visible');
    cy.removeNodeByName('log');
    cy.get('.pf-topology-side-bar').should('not.be.visible');

    // Blocked by https://github.com/KaotoIO/kaoto/issues/527
    // cy.openStepConfigurationTab('timer');
    // cy.get('.pf-topology-side-bar').should('be.visible');
    // cy.removeNodeByName('setHeader');
    // cy.get('.pf-topology-side-bar').should('be.visible');
  });
});
