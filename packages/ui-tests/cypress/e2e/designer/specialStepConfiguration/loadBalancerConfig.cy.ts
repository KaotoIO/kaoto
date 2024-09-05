describe('Tests for sidebar loadBalancer step configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar loadBalancer configuration in CR', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('marshal');
    cy.chooseFromCatalog('processor', 'loadBalance');
    cy.openStepConfigurationTab('loadBalance');
    cy.selectFormTab('All');

    cy.get('[data-testid="loadbalancer-config-card"] button').click();
    cy.get('[data-testid="loadbalancer-dropdownitem-roundRobinLoadBalancer"] button').click();

    cy.get('[data-testid="metadata-editor-form-loadbalancer"]')
      .find('input[data-testid="text-field"]')
      .type('roundRobinId');

    cy.get(`input[name="id"]`).eq(1).clear().type('testId');
    cy.get(`textarea[name="description"]`).clear().type('loadBalancerDescription');
    cy.get(`input[name="inheritErrorHandler"]`).check();
    cy.closeStepConfigurationTab();

    cy.selectInsertNode('loadBalancerDescription');
    cy.chooseFromCatalog('component', 'log');

    cy.selectInsertNode('loadBalancerDescription');
    cy.chooseFromCatalog('component', 'log');

    const loadBalanceConfig = [
      '- loadBalance:',
      'steps:',
      '- to:',
      'parameters: {}',
      'uri: log:InfoLogger',
      '- to:',
      'parameters: {}',
      'uri: log:InfoLogger',
      'description: loadBalancerDescription',
      'inheritErrorHandler: true',
      'id: testId',
      'roundRobinLoadBalancer:',
      'id: roundRobinId',
    ];

    cy.openSourceCode();
    // CHECK changes are reflected in the code editor
    cy.checkMultiLineContent(loadBalanceConfig);
  });
});
