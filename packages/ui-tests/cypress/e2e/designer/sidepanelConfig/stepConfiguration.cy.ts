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
    cy.get(`input[name="#.message"]`).clear();
    cy.closeStepConfigurationTab();

    // Configure kafka-sink step
    cy.openStepConfigurationTab('kafka-sink');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('topic', 'topicname');
    cy.interactWithConfigInputObject('bootstrapServers', 'bootstrap');
    cy.interactWithConfigInputObject('oauthClientId', 'clientId');
    cy.interactWithConfigInputObject('oauthClientSecret', 'sasl');
    cy.interactWithConfigInputObject('saslUsername', 'user');
    cy.interactWithConfigInputObject('saslPassword', 'password');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('period: 3000');
    cy.checkCodeSpanLine('message: ""', 0);
    cy.checkCodeSpanLine('topic: topicname');
    cy.checkCodeSpanLine('bootstrapServers: bootstrap');
    cy.checkCodeSpanLine('oauthClientId: clientId');
    cy.checkCodeSpanLine('oauthClientSecret: sasl');
    cy.checkCodeSpanLine('saslUsername: user');
    cy.checkCodeSpanLine('saslPassword: password');
  });
});
