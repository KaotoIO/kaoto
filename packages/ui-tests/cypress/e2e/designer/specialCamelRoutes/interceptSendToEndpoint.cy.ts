describe('Test for interceptSendToEndpoint configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root interceptSendToEndpoint configuration', () => {
    cy.selectCamelRouteType('Configuration', 'interceptSendToEndpoint');

    cy.get('[data-id^="interceptSendToEndpoint"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('skipSendToOriginalEndpoint', 'testSkipSendToOriginalEndpoint');

    cy.get('#processor-advanced-expandable-section-toggle').click();
    cy.interactWithConfigInputObject('afterUri', 'testAfterUri');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- interceptSendToEndpoint:');
    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('skipSendToOriginalEndpoint: testSkipSendToOriginalEndpoint');
    cy.checkCodeSpanLine('afterUri: testAfterUri');
  });
});
