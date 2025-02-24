describe('Tests for sidebar loadBalancer step configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar loadBalancer configuration in CR', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('marshal');
    cy.chooseFromCatalog('processor', 'loadBalance');
    cy.openGroupConfigurationTab('loadBalance');
    cy.selectFormTab('All');

    cy.get('[data-testid="#__oneof-list-typeahead-select-input"]').click();
    cy.get('.pf-v6-c-menu__item-text').contains('Round Robin Load Balancer').first().click();

    cy.interactWithConfigInputObject('roundRobinLoadBalancer.id', 'roundRobinId');
    cy.interactWithConfigInputObject('id', 'testId');
    cy.interactWithConfigInputObject('description', 'loadBalancerDescription');
    cy.interactWithConfigInputObject('inheritErrorHandler');
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
