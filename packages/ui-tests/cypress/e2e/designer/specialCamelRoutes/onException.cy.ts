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

    cy.openGroupConfigurationTab('onException');

    cy.selectFormTab('All');
    cy.selectInTypeaheadField('redeliveryPolicy.retriesExhaustedLogLevel', 'INFO');
    cy.selectInTypeaheadField('redeliveryPolicy.retryAttemptedLogLevel', 'INFO');

    cy.interactWithConfigInputObject('description', 'testDescription');
    cy.interactWithConfigInputObject('onExceptionOccurredRef', 'testOnExceptionOccurredRef');
    cy.interactWithConfigInputObject('onRedeliveryRef', 'testOnRedeliveryRef');
    cy.interactWithConfigInputObject('redeliveryPolicy.id', 'testRedeliveryPolicyId');
    cy.interactWithConfigInputObject('redeliveryPolicy.allowRedeliveryWhileStopping');
    cy.interactWithConfigInputObject('redeliveryPolicy.asyncDelayedRedelivery');
    cy.interactWithConfigInputObject('redeliveryPolicy.backOffMultiplier', '3.0');
    cy.interactWithConfigInputObject('redeliveryPolicy.collisionAvoidanceFactor', '0.2');
    cy.interactWithConfigInputObject('redeliveryPolicy.delayPattern', 'testRedeliveryPolicyDelayPattern');
    cy.interactWithConfigInputObject('redeliveryPolicy.disableRedelivery');
    cy.interactWithConfigInputObject('redeliveryPolicy.exchangeFormatterRef', 'testExchangeFormatterRef');
    cy.interactWithConfigInputObject('redeliveryPolicy.logContinued');
    cy.interactWithConfigInputObject('redeliveryPolicy.logExhausted');
    cy.interactWithConfigInputObject('redeliveryPolicy.logExhaustedMessageBody');
    cy.interactWithConfigInputObject('redeliveryPolicy.logExhaustedMessageHistory');
    cy.interactWithConfigInputObject('redeliveryPolicy.logHandled');
    cy.interactWithConfigInputObject('redeliveryPolicy.logNewException');
    cy.interactWithConfigInputObject('redeliveryPolicy.logRetryAttempted');
    cy.interactWithConfigInputObject('redeliveryPolicy.logRetryStackTrace');
    cy.interactWithConfigInputObject('redeliveryPolicy.logStackTrace');
    cy.interactWithConfigInputObject('redeliveryPolicy.maximumRedeliveries', '10');
    cy.interactWithConfigInputObject('redeliveryPolicy.maximumRedeliveryDelay', '40000');
    cy.interactWithConfigInputObject('redeliveryPolicy.redeliveryDelay', '2000');
    cy.interactWithConfigInputObject('redeliveryPolicy.retryAttemptedLogInterval', '2');
    cy.interactWithConfigInputObject('redeliveryPolicyRef', 'testRedeliveryPolicyRef');

    cy.get('[data-fieldname="retryWhile"]').within(() => {
      cy.selectExpression('Constant');
      cy.interactWithExpressionInputObject('expression', `retryWhile.constant`);
      cy.interactWithExpressionInputObject('id', 'retryWhile.constantExpressionId');
    });
    cy.get('[data-fieldname="handled"]').within(() => {
      cy.selectExpression('Constant');
      cy.interactWithExpressionInputObject('expression', `handled.constant`);
      cy.interactWithExpressionInputObject('id', 'handled.constantExpressionId');
    });
    cy.get('[data-fieldname="continued"]').within(() => {
      cy.selectExpression('Constant');
      cy.interactWithExpressionInputObject('expression', `continued.constant`);
      cy.interactWithExpressionInputObject('id', 'continued.constantExpressionId');
    });
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
