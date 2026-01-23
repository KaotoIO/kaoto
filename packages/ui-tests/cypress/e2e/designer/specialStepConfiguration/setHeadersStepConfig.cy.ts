describe('Tests for sidebar setHeaders step configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar setHeaders configuration in CR', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('marshal');
    cy.chooseFromCatalog('processor', 'setHeaders');
    cy.openStepConfigurationTab('setHeaders');
    cy.selectFormTab('All');

    cy.get('[data-testid="#.headers__add"]').click();

    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('simple.resultType', 'java.lang.String');
    cy.interactWithExpressionInputObject('simple.expression', `{{}random(1,100)}`);
    cy.interactWithExpressionInputObject('simple.id', 'simpleExpressionId');

    cy.get('[data-testid="#.headers__add"]').click();

    cy.selectExpression('Constant', 0);
    cy.interactWithExpressionInputObject('constant.resultType', 'java.lang.String');
    cy.interactWithExpressionInputObject('constant.expression', `constant`, 1);
    cy.interactWithExpressionInputObject('constant.id', 'constantExpressionId', 1);

    cy.openSourceCode();
    const headers = [
      'headers:',
      '- name: ""',
      'constant:',
      'id: constantExpressionId',
      'expression: constant',
      'resultType: java.lang.String',

      '- name: ""',
      'simple:',
      'id: simpleExpressionId',
      'expression: "{random(1,100)}"',
      'resultType: java.lang.String',
    ];

    // CHECK changes are reflected in the code editor
    cy.checkMultiLineContent(headers);
  });
});
