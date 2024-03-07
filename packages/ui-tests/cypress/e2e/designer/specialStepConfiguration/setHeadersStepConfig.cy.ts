describe('Tests for sidebar setHeaders step configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar setHeaders configuration in CR', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('marshal');
    cy.chooseFromCatalog('processor', 'setHeaders');
    cy.openStepConfigurationTab('setHeaders');

    cy.get('[data-testid="list-add-field"]').click();
    cy.get('[data-testid="launch-expression-modal-btn"]').should('be.visible').click();

    cy.selectExpression('Simple');
    cy.interactWithExpressinInputObject('expression', `{{}random(1,100)}`);
    cy.interactWithExpressinInputObject('id', 'simpleExpressionId');
    cy.interactWithExpressinInputObject('resultType', 'java.lang.String');
    cy.confirmExpressionModal();

    cy.get('[data-testid="list-add-field"]').click();
    cy.get('[data-testid="launch-expression-modal-btn"]').eq(1).should('be.visible').click();

    cy.selectExpression('Constant');
    cy.interactWithExpressinInputObject('expression', `constant`);
    cy.interactWithExpressinInputObject('id', 'constantExpressionId');
    cy.interactWithExpressinInputObject('resultType', 'java.lang.String');
    cy.confirmExpressionModal();

    cy.openSourceCode();
    const headers = [
      'headers:',
      '- expression:',
      'simple:',
      'id: simpleExpressionId',
      'expression: "{random(1,100)}"',
      'resultType: java.lang.String',
      '- expression:',
      'constant:',
      'id: constantExpressionId',
      'expression: constant',
      'resultType: java.lang.String',
    ];
    // CHECK changes are reflected in the code editor
    cy.checkMultiLineContent(headers);
  });
});
