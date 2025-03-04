describe('Test for errorHandler configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('ErrorHandler types check', () => {
    cy.selectCamelRouteType('Error Handling', 'errorHandler');

    cy.openStepConfigurationTab('errorHandler');
    cy.selectFormTab('All');
    cy.get(`div[data-testid="#__oneof-list-typeahead-select-input"]`).clear();

    cy.get('ul.pf-v6-c-menu__list > li:first')
      .should('contain.text', 'Dead Letter Channel')
      .next('li')
      .should('contain.text', 'Default Error Handler')
      .next('li')
      .should('contain.text', 'Jta Transaction Error Handler')
      .next('li')
      .should('contain.text', 'No Error Handler')
      .next('li')
      .should('contain.text', 'Ref Error Handler')
      .next('li')
      .should('contain.text', 'Spring Transaction Error Handler');
  });

  it('Root Default error handler configuration', () => {
    cy.selectCamelRouteType('Error Handling', 'errorHandler');

    cy.openStepConfigurationTab('errorHandler');
    cy.selectFormTab('All');

    cy.get(`div[data-testid="#__oneof-list-typeahead-select-input"]`).clear();
    cy.get('.pf-v6-c-menu__item-text').contains('Default Error Handler').first().click();
    cy.expandWrappedSection('#.defaultErrorHandler-Advanced');

    cy.interactWithConfigInputObject('defaultErrorHandler.id', 'testId');
    cy.selectInTypeaheadField('defaultErrorHandler.level', 'INFO');
    cy.interactWithConfigInputObject('defaultErrorHandler.logName', 'testLogName');
    cy.interactWithConfigInputObject('defaultErrorHandler.loggerRef', 'testLoggerRef');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- errorHandler:');
    cy.checkCodeSpanLine('defaultErrorHandler:');
    cy.checkCodeSpanLine('id: testId');
    cy.checkCodeSpanLine('logName: testLogName');
    cy.checkCodeSpanLine('loggerRef: testLoggerRef');
  });
});
