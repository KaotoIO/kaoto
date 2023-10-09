describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar step configuration', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');
    cy.openDesignPage();
    // Configure timer - source step
    cy.openStepConfigurationTab('timer-source');
    cy.interactWithConfigInputObject('period', '3000');
    cy.closeStepConfigurationTab();

    // Configure kafka-sink step
    cy.openStepConfigurationTab('kafka-sink');
    cy.interactWithConfigInputObject('topic', 'topicname');
    cy.interactWithConfigInputObject('bootstrapServers', 'bootstrap');
    cy.interactWithConfigInputObject('securityProtocol', 'security');
    cy.interactWithConfigInputObject('saslMechanism', 'sasl');
    cy.interactWithConfigInputObject('user', 'user');
    cy.interactWithConfigInputObject('password', 'password');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('period: 3000');
    cy.checkCodeSpanLine('topic: topicname');
    cy.checkCodeSpanLine('bootstrapServers: bootstrap');
    cy.checkCodeSpanLine('securityProtocol: security');
    cy.checkCodeSpanLine('saslMechanism: sasl');
    cy.checkCodeSpanLine('user: user');
    cy.checkCodeSpanLine('password: password');
  });
});
