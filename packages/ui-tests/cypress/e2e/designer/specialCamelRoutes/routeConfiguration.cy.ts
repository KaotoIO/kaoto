describe('Test for root route configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Update routeConfiguration description', () => {
    cy.selectCamelRouteType('Configuration', 'routeConfiguration');

    // Open routeConfiguration configuration tab, using the first routeConfiguration node
    cy.get(`g[data-grouplabel^="routeConfiguration-"]`).eq(0).click({ force: true });
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('description', 'routeConfigurationDescription');
    cy.closeStepConfigurationTab();

    cy.openGroupConfigurationTab('routeConfigurationDescription');
  });

  it('Root route configuration', () => {
    cy.selectCamelRouteType('Configuration', 'routeConfiguration');

    // Open routeConfiguration configuration tab, using the first routeConfiguration node
    cy.get(`g[data-grouplabel^="routeConfiguration-"]`).eq(0).click({ force: true });

    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'description Label');
    cy.get(`[data-testid="#.errorHandler__set"]`).click();
    cy.interactWithConfigInputObject('errorHandler.id', 'testErrorHandlerId');
    cy.expandWrappedSection('#-Advanced');
    cy.interactWithConfigInputObject('precondition', 'testPrecondition');
    cy.closeStepConfigurationTab();

    // Insert special node intercept to Route Configuration
    cy.selectInsertSpecialNode('description Label');
    cy.chooseFromCatalog('processor', 'intercept');

    cy.openSourceCode();

    cy.checkCodeSpanLine('- intercept:');
    cy.checkCodeSpanLine('- routeConfiguration:');
    cy.checkCodeSpanLine('description: description Label');
    cy.checkCodeSpanLine('errorHandler:');
    cy.checkCodeSpanLine('id: testErrorHandlerId');
    cy.checkCodeSpanLine('precondition: testPrecondition');
  });
});
