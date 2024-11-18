import { selectors } from '@kaoto/kaoto/testing';

describe('Tests for user specified Quarkus catalog type', () => {
  // Specify custom catalog URL
  before(() => {
    cy.openHomePage();
    cy.openSettings();
    cy.interactWithConfigInputObject('catalogUrl', Cypress.config().baseUrl + '/camel-catalog/index.json');
    cy.get(selectors.SETTINGS_FORM_SAVE_BTN).click();
    cy.waitSchemasLoading();
  });

  // Reset catalog URL
  after(() => {
    cy.openSettings();
    cy.get('input[name="catalogUrl"]').clear();
    cy.get(selectors.SETTINGS_FORM_SAVE_BTN).click();
    cy.waitSchemasLoading();
  });

  const runtime = 'Quarkus';

  it('User specified Camel Quarkus catalog with CR', () => {
    cy.openDesignPage();
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.hoverOnRuntime(runtime);
    cy.get(`[data-testid^="runtime-selector-Camel ${runtime}"]`).then(($element) => {
      const dataTestidValue = $element.attr('data-testid');
      const elementVersion = dataTestidValue!.substring(dataTestidValue!.lastIndexOf(' ') + 1);
      cy.selectAppendNode('setHeader');
      cy.checkCatalogVersion(elementVersion);
    });

    cy.chooseFromCatalog('component', 'dropbox');
    cy.checkNodeExist('dropbox', 1);

    cy.selectPrependNode('setHeader');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: dropbox', 1);
    cy.checkCodeSpanLine('log', 1);
  });
});
