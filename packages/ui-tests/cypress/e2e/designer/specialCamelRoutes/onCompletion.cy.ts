describe('Test for onCompletion configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root onCompletion configuration', () => {
    cy.selectCamelRouteType('Configuration', 'onCompletion');

    cy.openGroupConfigurationTab('onCompletion');

    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('onCompleteOnly');
    cy.interactWithConfigInputObject('onFailureOnly');

    cy.contains('button', 'Processor advanced properties').click();
    cy.selectInTypeaheadField('mode', 'BeforeConsumer');
    cy.interactWithConfigInputObject('parallelProcessing');
    cy.interactWithConfigInputObject('useOriginalMessage');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- onCompletion:');
    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('onCompleteOnly: true');
    cy.checkCodeSpanLine('onFailureOnly: true');
    cy.checkCodeSpanLine('mode: BeforeConsumer');
    cy.checkCodeSpanLine('parallelProcessing: true');
    cy.checkCodeSpanLine('useOriginalMessage: true');
  });
});
