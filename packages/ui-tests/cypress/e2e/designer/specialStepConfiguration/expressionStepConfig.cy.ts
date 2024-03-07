describe('Tests for sidebar expression configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar expression configuration', () => {
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

  //reproducer for https://github.com/KaotoIO/kaoto-next/issues/518
  it('Design - name attribute was sometimes lost after expression configuration', () => {
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
    cy.chooseFromCatalog('processor', 'setHeader');

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

  // Blocked by: https://github.com/KaotoIO/kaoto-next/issues/904
  it.skip('Design - expression configuration with switching type', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();
    // Configure setHeader expression
    cy.openStepConfigurationTab('setHeader');
    cy.openExpressionModal();
    cy.selectExpression('Simple');
    cy.interactWithExpressinInputObject('expression', `{{}{{}header.baz}}`);
    cy.interactWithExpressinInputObject('id', 'simpleExpressionId');
    cy.interactWithExpressinInputObject('resultType', 'java.lang.String');
    cy.selectExpression('Constant');
    cy.confirmExpressionModal();

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{header.baz}}"', 1);
    cy.checkCodeSpanLine('id: constantExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });

  it('Design - sidebar expression configuration in Kamelet', () => {
    cy.uploadFixture('flows/BasicKamelet.yaml');
    cy.openDesignPage();
    // Configure setBody expression
    cy.openStepConfigurationTab('setBody');
    cy.openExpressionModal();
    cy.selectExpression('Simple');
    cy.interactWithExpressinInputObject('expression', `{{}{{}body.baz}}`);
    cy.interactWithExpressinInputObject('id', 'simpleExpressionId');
    cy.interactWithExpressinInputObject('resultType', 'java.lang.String');
    cy.confirmExpressionModal();

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{body.baz}}"', 1);
    cy.checkCodeSpanLine('id: simpleExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });
});
