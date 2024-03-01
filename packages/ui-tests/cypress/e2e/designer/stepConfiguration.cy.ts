describe('Tests for Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar step configuration', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');
    cy.openDesignPage();
    // Configure timer - source step
    cy.openStepConfigurationTab('timer-source');
    cy.interactWithConfigInputObject('period', '3000');
    cy.closeStepConfigurationTab();

    // Configure kafka-sink step
    cy.openStepConfigurationTab('kafka-sink');
    cy.interactWithConfigInputObject('topic', 'topicname');
    cy.interactWithConfigInputObject('bootstrapServers', 'bootstrap');
    cy.interactWithConfigInputObject('securityProtocol', 'security');
    cy.interactWithConfigInputObject('saslMechanism', 'sasl');
    cy.interactWithConfigInputObject('user', 'user');
    cy.interactWithConfigInputObject('password', 'password');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('period: "3000"');
    cy.checkCodeSpanLine('topic: topicname');
    cy.checkCodeSpanLine('bootstrapServers: bootstrap');
    cy.checkCodeSpanLine('securityProtocol: security');
    cy.checkCodeSpanLine('saslMechanism: sasl');
    cy.checkCodeSpanLine('user: user');
    cy.checkCodeSpanLine('password: password');
  });

  it('Design - sidebar extensions configuration', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();
    // Configure setHeader expression
    cy.openStepConfigurationTab('setHeader');
    cy.openExpressionModal();
    cy.selectExpression('Simple');
    cy.interactWithExpressinInputObject('expression', `{{}{{}header.baz}}`);
    cy.interactWithExpressinInputObject('id', 'simpleExpressionId');
    cy.interactWithExpressinInputObject('resultType', 'java.lang.String');
    cy.confirmExpressionModal();

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{header.baz}}"', 1);
    cy.checkCodeSpanLine('id: simpleExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });

  it('Design - sidebar dataformat configuration', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('setHeader');
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('marshal');
    cy.get('#marshal').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);

    // Configure marshal dataformat
    cy.openStepConfigurationTab('marshal');
    cy.selectDataformat('Base64');
    cy.interactWithDataformatInputObject('lineLength', '128');
    cy.interactWithDataformatInputObject('id', 'simpleDataformatId');
    cy.interactWithDataformatInputObject('lineSeparator', 'simpleLineSeparator');
    cy.interactWithDataformatInputObject('urlSafe');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('lineLength: "128"', 1);
    cy.checkCodeSpanLine('id: simpleDataformatId', 1);
    cy.checkCodeSpanLine('lineSeparator: simpleLineSeparator', 1);
    cy.checkCodeSpanLine('urlSafe: true', 1);
  });

  //reproducer for https://github.com/KaotoIO/kaoto-next/issues/518
  it('Design - name attribute was sometimes lost after extensions configuration', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.openExpressionModal();
    cy.selectExpression('JQ');
    cy.interactWithConfigInputObject('expression', '.id');
    cy.interactWithConfigInputObject('resultType', 'java.lang.String');
    cy.interactWithConfigInputObject('trim');
    cy.confirmExpressionModal();

    cy.selectAppendNode('setHeader');
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('setHeader');
    cy.get('#setHeader').should('be.visible').click();
    // wait for the canvas rerender
    cy.wait(1000);

    cy.checkNodeExist('setHeader', 2);

    cy.openStepConfigurationTab('setHeader', 1);
    cy.openExpressionModal();
    cy.selectExpression('JQ');
    cy.interactWithConfigInputObject('expression', '.name');
    cy.interactWithConfigInputObject('resultType', 'java.lang.String');
    cy.interactWithConfigInputObject('trim');
    cy.confirmExpressionModal();

    cy.openStepConfigurationTab('setHeader', 0);

    // Check the configured fields didn't disappear from the first node
    cy.openExpressionModal();
    cy.checkConfigCheckboxObject('trim', true);
    cy.checkConfigInputObject('resultType', 'java.lang.String');
    cy.checkConfigInputObject('expression', '.id');
    cy.cancelExpressionModal();

    // Check the configured fields didn't disappear from the second node
    cy.openStepConfigurationTab('setHeader', 0);
    cy.openExpressionModal();
    cy.checkConfigCheckboxObject('trim', true);
    cy.checkConfigInputObject('resultType', 'java.lang.String');
    cy.checkConfigInputObject('expression', '.name');
    cy.cancelExpressionModal();

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: .id', 1);
    cy.checkCodeSpanLine('expression: .name', 1);
  });
});
