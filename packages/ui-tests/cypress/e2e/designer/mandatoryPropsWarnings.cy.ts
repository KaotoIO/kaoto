describe('Test for Multi route actions from the canvas', () => {
  beforeEach(() => {
    cy.openHomePage();
  });
  it('Check the canvas node warnings in Camel Route', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'github');

    cy.checkNodeExist('github', 1);

    cy.get('[data-id^="github"] g').find('.pf-topology__node__decorator__bg').click();
    cy.get('.pf-v5-c-tooltip__content').should(
      'have.text',
      '3 required parameters are not yet configured: [ type,repoName,repoOwner ]',
    );

    cy.openStepConfigurationTab('github');
    cy.interactWithConfigInputObject('parameters.repoName', 'test');
    cy.closeStepConfigurationTab();

    cy.get('[data-id^="github"] g').find('.pf-topology__node__decorator__bg').click();
    cy.get('.pf-v5-c-tooltip__content').should(
      'have.text',
      '2 required parameters are not yet configured: [ type,repoOwner ]',
    );
  });

  it('Check the canvas node warnings in Pipe', () => {
    cy.uploadFixture('flows/ErrorHandlerPipe.yaml');
    cy.openDesignPage();

    cy.get('[data-id^="delay-action"] g').find('.pf-topology__node__decorator__bg').click();
    cy.get('.pf-v5-c-tooltip__content').should(
      'have.text',
      '1 required parameter is not yet configured: [ milliseconds ]',
    );

    cy.openStepConfigurationTab('delay-action');
    cy.interactWithConfigInputObject('milliseconds', '1000');
    cy.closeStepConfigurationTab();

    cy.get('[data-id^="delay-action"] g').find('.pf-topology__node__decorator__bg').should('not.exist');
  });
});
