describe('Test for interceptSendToEndpoint configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root interceptSendToEndpoint configuration', () => {
    cy.selectCamelRouteType('Configuration', 'interceptSendToEndpoint');

    cy.openGroupConfigurationTab('interceptSendToEndpoint');

    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('skipSendToOriginalEndpoint');

    cy.expandWrappedSection('#-Advanced');
    cy.interactWithConfigInputObject('afterUri', 'testAfterUri');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- interceptSendToEndpoint:');
    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('skipSendToOriginalEndpoint: true');
    cy.checkCodeSpanLine('afterUri: testAfterUri');
  });
});
