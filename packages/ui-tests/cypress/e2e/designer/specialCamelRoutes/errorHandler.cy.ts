describe('Test for errorHandler configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('ErrorHandler types check', () => {
    cy.selectCamelRouteType('Error Handling', 'errorHandler');

    cy.get('[data-id^="errorHandler"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();

    cy.get('#-oneof-toggle').click();
    cy.get('ul.pf-v5-c-menu__list > li:first')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-Dead Letter Channel')
      .next('li')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-Default Error Handler')
      .next('li')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-Jta Transaction Error Handler')
      .next('li')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-No Error Handler')
      .next('li')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-Ref Error Handler')
      .next('li')
      .should('have.attr', 'data-testid', '-oneof-select-dropdownlist-Spring Transaction Error Handler');
  });

  it('Root Default error handler configuration', () => {
    cy.selectCamelRouteType('Error Handling', 'errorHandler');

    cy.get('[data-id^="errorHandler"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();

    cy.get('#-oneof-toggle').click();
    cy.get('[data-testid="-oneof-select-dropdownlist-Default Error Handler"]').click();

    cy.interactWithConfigInputObject('defaultErrorHandler.executorServiceRef', 'testExecutorServiceRef');
    cy.interactWithConfigInputObject('defaultErrorHandler.id', 'testId');
    cy.selectInTypeaheadField('defaultErrorHandler.level', 'INFO');
    cy.interactWithConfigInputObject('defaultErrorHandler.logName', 'testLogName');
    cy.interactWithConfigInputObject('defaultErrorHandler.loggerRef', 'testLoggerRef');
    cy.interactWithConfigInputObject('defaultErrorHandler.onExceptionOccurredRef', 'testOnExceptionOccuredRef');
    cy.interactWithConfigInputObject('defaultErrorHandler.onPrepareFailureRef', 'testOnPrepareFailureRef');
    cy.interactWithConfigInputObject('defaultErrorHandler.onRedeliveryRef', 'testOnRedeliveryRef');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- errorHandler:');
    cy.checkCodeSpanLine('defaultErrorHandler:');
    cy.checkCodeSpanLine('executorServiceRef: testExecutorServiceRef');
    cy.checkCodeSpanLine('id: testId');
    cy.checkCodeSpanLine('logName: testLogName');
    cy.checkCodeSpanLine('loggerRef: testLoggerRef');
    cy.checkCodeSpanLine('onExceptionOccurredRef: testOnExceptionOccuredRef');
    cy.checkCodeSpanLine('onPrepareFailureRef: testOnPrepareFailureRef');
    cy.checkCodeSpanLine('onRedeliveryRef: testOnRedeliveryRef');
  });
});
