describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar step configuration', () => {
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openDesignPage();
    // Configure timer - source step
    cy.openStepConfigurationTab('timer-source');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('period', '3000');
    cy.interactWithConfigInputObject('message', 'test message');
    cy.get(`input[name="message"]`).clear();
    cy.closeStepConfigurationTab();

    // Configure kafka-sink step
    cy.openStepConfigurationTab('kafka-sink');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('topic', 'topicname');
    cy.interactWithConfigInputObject('bootstrapServers', 'bootstrap');
    cy.interactWithConfigInputObject('securityProtocol', 'security');
    cy.interactWithConfigInputObject('saslMechanism', 'sasl');
    cy.interactWithConfigInputObject('user', 'user');
    cy.interactWithConfigInputObject('password', 'password');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('period: "3000"');
    cy.checkCodeSpanLine('message: ""', 0);
    cy.checkCodeSpanLine('topic: topicname');
    cy.checkCodeSpanLine('bootstrapServers: bootstrap');
    cy.checkCodeSpanLine('securityProtocol: security');
    cy.checkCodeSpanLine('saslMechanism: sasl');
    cy.checkCodeSpanLine('user: user');
    cy.checkCodeSpanLine('password: password');
  });

  it('Disable and Enable steps using the step configuration', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');

    /** Check the toolbar's Disable button is on "Disable step" mode now */
    cy.get('[data-testid="step-toolbar-button-disable"]').should('have.attr', 'title', 'Disable step');
    /** Check the node now is in disabled mode */
    cy.get(`g[data-nodelabel="setHeader"]`).should('have.attr', 'data-disabled', 'false');

    cy.selectFormTab('All');
    cy.get('#expandable-section-toggle-processor-advanced').click();
    cy.interactWithConfigInputObject('disabled');

    /** Check the toolbar's Disable button is on "Enable step" mode now */
    cy.get('[data-testid="step-toolbar-button-disable"]').should('have.attr', 'title', 'Enable step');
    /** Check the node now is in disabled mode */
    cy.get(`g[data-nodelabel="setHeader"]`).should('have.attr', 'data-disabled', 'true');
  });
});
