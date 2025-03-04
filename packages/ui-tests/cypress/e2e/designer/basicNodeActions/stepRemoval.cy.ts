describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - remove steps from CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.removeNodeByName('setHeader');
    cy.removeNodeByName('log');
    cy.removeNodeByName('marshal');
    cy.checkNodeExist('timer', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: timer:test', 1);
    cy.checkCodeSpanLine('marshal', 0);
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
    cy.checkNodeExist('source', 1);
    cy.checkNodeExist('sink', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('json-deserialize-action', 0);
    cy.checkCodeSpanLine('kafka-source', 0);
    cy.checkCodeSpanLine('kafka-sink', 0);
    cy.checkCodeSpanLine('source: {}', 1);
    cy.checkCodeSpanLine('sink: {}', 1);
  });

  it('In an integration with at least two steps, user can not delete the from step', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    // CHECK that delete menu does not exist for the from node
    cy.get(`[data-nodelabel="timer"]`).parent().eq(0).rightclick({ force: true });
    cy.get(`[data-testid="context-menu-item-delete"]`).should('not.exist');

    cy.checkNodeExist('timer', 1);

    cy.openSourceCode();
    // CHECK that YAML contains the 'timer:test'
    cy.checkCodeSpanLine('timer:test', 1);
  });

  it('Step detail - User deletes a step, which closes the detail drawer', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('log');
    cy.get('.pf-topology-resizable-side-bar').should('be.visible');
    cy.removeNodeByName('log');
    cy.get('.pf-topology-resizable-side-bar').should('not.exist');

    // Blocked by https://github.com/KaotoIO/kaoto/issues/527
    // cy.openStepConfigurationTab('timer');
    // cy.get('.pf-topology-resizable-side-bar').should('be.visible');
    // cy.removeNodeByName('setHeader');
    // cy.get('.pf-topology-resizable-side-bar').should('be.visible');
  });
});
