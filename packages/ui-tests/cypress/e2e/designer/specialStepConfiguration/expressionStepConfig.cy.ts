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
    cy.interactWithExpressionInputObject('simple.expression', `{{}{{}header.baz}}`);
    cy.interactWithExpressionInputObject('simple.id', 'simpleExpressionId');
    cy.interactWithExpressionInputObject('simple.resultType', 'java.lang.String');
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

    cy.openStepConfigurationTabByPath('custom-node__route.from.steps.0.setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('JQ');
    cy.interactWithExpressionInputObject('jq.expression', '.id');
    cy.interactWithExpressionInputObject('jq.resultType', 'java.lang.String');
    cy.expandWrappedSection('jq-Advanced');
    cy.interactWithExpressionInputObject('jq.trim');

    // TODO: Closing the configuration panel because adding a new step keep the selection status,
    // but closes the panel. This will be fixed in https://github.com/KaotoIO/kaoto/issues/1923
    cy.closeStepConfigurationTab();

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('processor', 'setHeader');

    cy.checkNodeExist('setHeader', 2);

    cy.openStepConfigurationTabByPath('custom-node__route.from.steps.1.setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('JQ');
    cy.interactWithExpressionInputObject('jq.expression', '.name');
    cy.interactWithExpressionInputObject('jq.resultType', 'java.lang.String');
    cy.expandWrappedSection('jq-Advanced');
    cy.interactWithExpressionInputObject('jq.trim');

    cy.openStepConfigurationTabByPath('custom-node__route.from.steps.0.setHeader');

    // Check the configured fields didn't disappear from the first node
    cy.expandWrappedSection('jq-Advanced');
    cy.get(`input[name="jq.trim"]`).should(`be.checked`);
    cy.interactWithExpressionInputObject('jq.resultType', 'java.lang.String');
    cy.interactWithExpressionInputObject('jq.expression', '.id');

    // Check the configured fields didn't disappear from the second node
    cy.openStepConfigurationTabByPath('custom-node__route.from.steps.1.setHeader');
    cy.expandWrappedSection('jq-Advanced');
    cy.get(`input[name="jq.trim"]`).should(`be.checked`);
    cy.interactWithExpressionInputObject('jq.resultType', 'java.lang.String');
    cy.interactWithExpressionInputObject('jq.expression', '.name');

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
    cy.interactWithExpressionInputObject('simple.expression', `{{}{{}header.baz}}`);
    cy.get('textarea[name="simple.expression"]').should('have.value', '{{header.baz}}');
    cy.selectExpression('Constant');
    cy.get('textarea[name="constant.expression"]').should('not.have.value', '{{header.baz}}');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{header.baz}}"', 0);
  });

  it('Design - sidebar expression configuration in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();
    // Configure setBody expression
    cy.openStepConfigurationTab('setBody');
    cy.selectFormTab('All');
    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('simple.expression', `{{}{{}body.baz}}`);
    cy.interactWithExpressionInputObject('simple.id', 'simpleExpressionId');
    cy.interactWithExpressionInputObject('simple.resultType', 'java.lang.String');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('expression: "{{body.baz}}"', 1);
    cy.checkCodeSpanLine('id: simpleExpressionId', 1);
    cy.checkCodeSpanLine('resultType: java.lang.String', 1);
  });
});
