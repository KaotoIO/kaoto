describe('Tests for sidebar expression configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar expression configuration', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    // Configure setHeader expression
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('expression', `{{}{{}header.baz}}`);
    cy.interactWithExpressionInputObject('id', 'simpleExpressionId');
    cy.addExpressionResultType('java.lang.String');
    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{header.baz}}"', 1);
    cy.checkCodeSpanLine('id: simpleExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });

  //reproducer for https://github.com/KaotoIO/kaoto/issues/518
  it('Design - name attribute was sometimes lost after expression configuration', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('JQ');
    cy.interactWithConfigInputObject('expression', '.id');
    cy.addExpressionResultType('java.lang.String');
    cy.interactWithConfigInputObject('trim');

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('processor', 'setHeader');

    cy.checkNodeExist('setHeader', 2);

    cy.openStepConfigurationTab('setHeader', 1);
    cy.selectFormTab('All');
    cy.selectExpression('JQ');
    cy.interactWithConfigInputObject('expression', '.name');
    cy.addExpressionResultType('java.lang.String');
    cy.interactWithConfigInputObject('trim');

    cy.openStepConfigurationTab('setHeader', 0);

    // Check the configured fields didn't disappear from the first node
    cy.checkConfigCheckboxObject('trim', true);
    cy.checkExpressionResultType('java.lang.String');
    cy.checkConfigInputObject('expression', '.id');

    // Check the configured fields didn't disappear from the second node
    cy.openStepConfigurationTab('setHeader', 0);
    cy.checkConfigCheckboxObject('trim', true);
    cy.addExpressionResultType('java.lang.String');
    cy.checkConfigInputObject('expression', '.name');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: .id', 1);
    cy.checkCodeSpanLine('expression: .name', 1);
  });

  // reproducer for: https://github.com/KaotoIO/kaoto/issues/904
  it('Design - expression configuration with switching type', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    // Configure setHeader expression
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('expression', `{{}{{}header.baz}}`);
    cy.get('textarea[name="expression"]').should('have.value', '{{header.baz}}');
    cy.selectExpression('Constant');
    cy.get('textarea[name="expression"]').should('not.have.value', '{{header.baz}}');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('constant: {}', 1);
    cy.checkCodeSpanLine('expression: "{{header.baz}}"', 0);
  });

  it('Design - sidebar expression configuration in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();
    // Configure setBody expression
    cy.openStepConfigurationTab('setBody');
    cy.selectFormTab('All');
    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('expression', `{{}{{}body.baz}}`);
    cy.interactWithExpressionInputObject('id', 'simpleExpressionId');
    cy.addExpressionResultType('java.lang.String');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{body.baz}}"', 1);
    cy.checkCodeSpanLine('id: simpleExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });
});
