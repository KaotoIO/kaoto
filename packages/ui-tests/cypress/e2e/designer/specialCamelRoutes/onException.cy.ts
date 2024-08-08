describe('Test for root on exception container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root onException steps config', () => {
    cy.uploadFixture('flows/camelRoute/onException.yaml');
    cy.openDesignPage();

    cy.selectInsertNode('onException-1234');
    cy.chooseFromCatalog('component', 'aws2-sqs');

    cy.selectAppendNode('aws2-sqs');
    cy.chooseFromCatalog('component', 'log');

    cy.checkNodeExist('aws2-sqs', 1);
    cy.checkNodeExist('log', 1);

    cy.openSourceCode();

    cy.checkCodeSpanLine('onException:');
    cy.checkCodeSpanLine('id: onException-1234');
    cy.checkCodeSpanLine('steps:');
    cy.checkCodeSpanLine('uri: aws2-sqs');
    cy.checkCodeSpanLine('uri: log');
  });

  it('Root onException config', () => {
    cy.uploadFixture('flows/camelRoute/onException.yaml');
    cy.openDesignPage();

    cy.get('[data-id^="onException"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();
    cy.selectFormTab('All');
    cy.selectInTypeaheadField('redeliveryPolicy.retriesExhaustedLogLevel', 'INFO');
    cy.selectInTypeaheadField('redeliveryPolicy.retryAttemptedLogLevel', 'INFO');

    cy.get(`textarea[name="description"]`).clear().type('testDescription');
    cy.get(`input[name="onExceptionOccurredRef"]`).clear().type('testOnExceptionOccurredRef');
    cy.get(`input[name="onRedeliveryRef"]`).clear().type('testOnRedeliveryRef');
    cy.get(`input[name="redeliveryPolicy.id"]`).clear().type('testRedeliveryPolicyId');
    cy.get(`input[name="redeliveryPolicy.allowRedeliveryWhileStopping"]`).check();
    cy.get(`input[name="redeliveryPolicy.asyncDelayedRedelivery"]`).check();
    cy.get(`input[name="redeliveryPolicy.backOffMultiplier"]`).clear().type('3.0');
    cy.get(`input[name="redeliveryPolicy.collisionAvoidanceFactor"]`).clear().type('0.2');
    cy.get(`input[name="redeliveryPolicy.delayPattern"]`).clear().type('testRedeliveryPolicyDelayPattern');
    cy.get(`input[name="redeliveryPolicy.disableRedelivery"]`).check();
    cy.get(`input[name="redeliveryPolicy.exchangeFormatterRef"]`).clear().type('testExchangeFormatterRef');
    cy.get(`input[name="redeliveryPolicy.logContinued"]`).check();
    cy.get(`input[name="redeliveryPolicy.logExhausted"]`).check();
    cy.get(`input[name="redeliveryPolicy.logExhaustedMessageBody"]`).check();
    cy.get(`input[name="redeliveryPolicy.logExhaustedMessageHistory"]`).check();
    cy.get(`input[name="redeliveryPolicy.logHandled"]`).check();
    cy.get(`input[name="redeliveryPolicy.logNewException"]`).check();
    cy.get(`input[name="redeliveryPolicy.logRetryAttempted"]`).check();
    cy.get(`input[name="redeliveryPolicy.logRetryStackTrace"]`).check();
    cy.get(`input[name="redeliveryPolicy.logStackTrace"]`).check();
    cy.get(`input[name="redeliveryPolicy.maximumRedeliveries"]`).clear().type('10');
    cy.get(`input[name="redeliveryPolicy.maximumRedeliveryDelay"]`).clear().type('40000');
    cy.get(`input[name="redeliveryPolicy.redeliveryDelay"]`).clear().type('2000');
    cy.get(`input[name="redeliveryPolicy.retryAttemptedLogInterval"]`).clear().type('2');
    cy.get(`input[name="redeliveryPolicyRef"]`).clear().type('testRedeliveryPolicyRef');
    cy.openExpressionModal('retryWhile');
    cy.selectExpression('Constant');
    cy.interactWithExpressionInputObject('expression', `retryWhile.constant`);
    cy.interactWithExpressionInputObject('id', 'retryWhile.constantExpressionId');
    cy.confirmExpressionModal();
    cy.openExpressionModal('handled');
    cy.selectExpression('Constant');
    cy.interactWithExpressionInputObject('expression', `handled.constant`);
    cy.interactWithExpressionInputObject('id', 'handled.constantExpressionId');
    cy.confirmExpressionModal();
    cy.openExpressionModal('continued');
    cy.selectExpression('Constant');
    cy.interactWithExpressionInputObject('expression', `continued.constant`);
    cy.interactWithExpressionInputObject('id', 'continued.constantExpressionId');
    cy.confirmExpressionModal();

    cy.openSourceCode();

    cy.checkCodeSpanLine('description: testDescription');
    cy.checkCodeSpanLine('onExceptionOccurredRef: testOnExceptionOccurredRef');
    cy.checkCodeSpanLine('redeliveryPolicy:');
    cy.checkCodeSpanLine('allowRedeliveryWhileStopping: true');
    cy.checkCodeSpanLine('asyncDelayedRedelivery: true');
    cy.checkCodeSpanLine('backOffMultiplier: "3.0"');
    cy.checkCodeSpanLine('collisionAvoidanceFactor: "0.2"');
    cy.checkCodeSpanLine('delayPattern: testRedeliveryPolicyDelayPattern');
    cy.checkCodeSpanLine('disableRedelivery: true');
    cy.checkCodeSpanLine('exchangeFormatterRef: testExchangeFormatterRef');
    cy.checkCodeSpanLine('logContinued: true');
    cy.checkCodeSpanLine('logExhausted: true');
    cy.checkCodeSpanLine('logExhaustedMessageBody: true');
    cy.checkCodeSpanLine('logExhaustedMessageHistory: true');
    cy.checkCodeSpanLine('logHandled: true');
    cy.checkCodeSpanLine('logNewException: true');
    cy.checkCodeSpanLine('logRetryAttempted: true');
    cy.checkCodeSpanLine('logRetryStackTrace: true');
    cy.checkCodeSpanLine('logStackTrace: true');
    cy.checkCodeSpanLine('maximumRedeliveries: "10"');
    cy.checkCodeSpanLine('maximumRedeliveryDelay: "40000"');
    cy.checkCodeSpanLine('redeliveryDelay: "2000"');
    cy.checkCodeSpanLine('retryAttemptedLogInterval: "2"');
    cy.checkCodeSpanLine('redeliveryPolicyRef: testRedeliveryPolicyRef');

    cy.checkCodeSpanLine('retryWhile:');
    cy.checkCodeSpanLine('id: retryWhile.constantExpressionId');
    cy.checkCodeSpanLine('expression: retryWhile.constant');
    cy.checkCodeSpanLine('handled:');
    cy.checkCodeSpanLine('id: handled.constantExpressionId');
    cy.checkCodeSpanLine('expression: handled.constant');
    cy.checkCodeSpanLine('continued:');
    cy.checkCodeSpanLine('id: continued.constantExpressionId');
    cy.checkCodeSpanLine('expression: continued.constant');

    cy.checkCodeSpanLine('retriesExhaustedLogLevel: INFO');
    cy.checkCodeSpanLine('retryAttemptedLogLevel: INFO');
  });
});
