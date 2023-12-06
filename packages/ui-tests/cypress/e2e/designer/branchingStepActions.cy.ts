describe('User completes normal actions on steps in a branch', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User configures a step in a branch', () => {
    cy.uploadFixture('flows/ComplexKamelet.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('marshal');
    cy.interactWithConfigInputObject('allowJmsType');
    cy.interactWithConfigInputObject('collectionType', 'collection Type');

    cy.openSourceCode();
    // CHECK that the step yaml is updated
    cy.checkCodeSpanLine('allowJmsType: true');
    cy.checkCodeSpanLine('collectionType: collection Type');
  });

  it('User deletes a step in a branch', () => {
    cy.uploadFixture('flows/ComplexKamelet.yaml');
    cy.openDesignPage();

    cy.removeNodeByName('digitalocean');

    // CHECK that digitalocean step is deleted
    cy.checkNodeExist('digitalocean', 0);
  });

  it('User replaces a step in a branch', () => {
    cy.uploadFixture('flows/ComplexKamelet.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('digitalocean');
    cy.get('.pf-v5-c-text-input-group__text-input').click();
    cy.get('.pf-v5-c-text-input-group__text-input').type('amqp');
    cy.get('#amqp').should('be.visible').click();

    // CHECK that digitalocean step is deleted
    cy.checkNodeExist('digitalocean', 0);
    cy.checkNodeExist('amqp', 1);
  });
});
