describe('User completes normal actions on steps in a branch', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User configures a step in a branch', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('allowJmsType');
    cy.interactWithConfigInputObject('collectionType', 'collection Type');

    cy.openSourceCode();
    // CHECK that the step yaml is updated
    cy.checkCodeSpanLine('allowJmsType: true');
    cy.checkCodeSpanLine('collectionType: collection Type');
  });

  it('User deletes a step in a branch', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.removeNodeByName('digitalocean');

    // CHECK that digitalocean step is deleted
    cy.checkNodeExist('digitalocean', 0);
  });

  it('User replaces a step in a branch', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.selectReplaceNode('digitalocean');
    cy.chooseFromCatalog('component', 'amqp');

    // CHECK that digitalocean step is deleted
    cy.checkNodeExist('digitalocean', 0);
    cy.checkNodeExist('amqp', 1);
  });
});
