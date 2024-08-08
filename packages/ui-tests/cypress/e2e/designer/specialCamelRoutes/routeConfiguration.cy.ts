describe('Test for root route configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root route configuration', () => {
    cy.selectCamelRouteType('Configuration', 'routeConfiguration');

    cy.get('[data-id^="routeConfiguration"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();
    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('errorHandler.id', 'testErrorHandlerId');
    cy.interactWithConfigInputObject('precondition', 'testPrecondition');

    // Insert special node intercept to Route Configuration
    cy.selectInsertSpecialNode('routeConfiguration');
    cy.chooseFromCatalog('processor', 'intercept');

    cy.openSourceCode();

    cy.checkCodeSpanLine('- intercept:');
    cy.checkCodeSpanLine('- routeConfiguration:');
    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('errorHandler:');
    cy.checkCodeSpanLine('id: testErrorHandlerId');
    cy.checkCodeSpanLine('precondition: testPrecondition');
  });
});
