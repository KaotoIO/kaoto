describe('Tests for producer/consumer sidebar config', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Check if producer/consumer properties are allowed or forbidden on route nodes', () => {
    cy.uploadFixture('flows/camelRoute/consumerProducer.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('amqp');
    cy.selectFormTab('All');
    cy.get('.pf-v6-c-form__field-group-header-title-text').contains('Consumer (advanced)').should('exist');
    cy.get('.pf-v6-c-form__field-group-header-title-text').contains('Producer (advanced)').should('not.exist');

    cy.openStepConfigurationTab('activemq6');
    cy.selectFormTab('All');
    cy.get('.pf-v6-c-form__field-group-header-title-text').contains('Producer (advanced)').should('exist');
    cy.get('.pf-v6-c-form__field-group-header-title-text').contains('Consumer (advanced)').should('not.exist');
  });
});
