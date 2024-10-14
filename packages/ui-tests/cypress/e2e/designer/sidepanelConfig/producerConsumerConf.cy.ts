describe('Tests for producer/consumer sidebar config', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Check if producer/consumer properties are allowed or forbidden on route nodes', () => {
    cy.uploadFixture('flows/camelRoute/consumerProducer.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('amqp');
    cy.selectFormTab('All');
    cy.get('.pf-v5-c-expandable-section__toggle-text').contains('Consumer (advanced) properties').should('exist');
    cy.get('.pf-v5-c-expandable-section__toggle-text').contains('Producer (advanced) properties').should('not.exist');

    cy.openStepConfigurationTab('activemq6');
    cy.selectFormTab('All');
    cy.get('.pf-v5-c-expandable-section__toggle-text').contains('Producer (advanced) properties').should('exist');
    cy.get('.pf-v5-c-expandable-section__toggle-text').contains('Consumer (advanced) properties').should('not.exist');
  });
});
