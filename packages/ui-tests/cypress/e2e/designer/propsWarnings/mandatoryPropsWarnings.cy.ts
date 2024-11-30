import { selectors } from '@kaoto/kaoto/testing';

describe('Test for missing config props canvas warnings', () => {
  beforeEach(() => {
    cy.openHomePage();
  });
  it('Check the canvas node warnings in Camel Route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'github');

    cy.checkNodeExist('github', 1);

    cy.get('[data-id^="github"] g')
      .find(selectors.SPAN_ICON)
      .should('have.attr', 'title', '3 required parameters are not yet configured: [ type,repoName,repoOwner ]');

    cy.openStepConfigurationTab('github');

    cy.interactWithConfigInputObject('parameters.repoName', 'test');
    cy.closeStepConfigurationTab();

    cy.get('[data-id^="github"] g')
      .find(selectors.SPAN_ICON)
      .should('have.attr', 'title', '2 required parameters are not yet configured: [ type,repoOwner ]');
  });

  it('Check the canvas node warnings in Pipe', () => {
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openDesignPage();

    cy.get('[data-id^="delay-action"] g')
      .find(selectors.SPAN_ICON)
      .should('have.attr', 'title', '1 required parameter is not yet configured: [ milliseconds ]');

    cy.openStepConfigurationTab('delay-action');

    cy.interactWithConfigInputObject('milliseconds', '1000');
    cy.closeStepConfigurationTab();

    cy.get('[data-id^="delay-action"] g').find(selectors.SPAN_ICON).should('not.exist');
  });
});
