describe('Test for interceptSendToEndpoint configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root interceptSendToEndpoint configuration', () => {
    cy.selectCamelRouteType('Configuration', 'interceptSendToEndpoint');

    cy.get(`[data-testid^="custom-node__interceptSendToEndpoint"]`).click({ force: true });

    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('skipSendToOriginalEndpoint', 'testSkipSendToOriginalEndpoint');

    cy.contains('button', 'Processor advanced properties').click();
    cy.interactWithConfigInputObject('afterUri', 'testAfterUri');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- interceptSendToEndpoint:');
    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('skipSendToOriginalEndpoint: testSkipSendToOriginalEndpoint');
    cy.checkCodeSpanLine('afterUri: testAfterUri');
  });
});
