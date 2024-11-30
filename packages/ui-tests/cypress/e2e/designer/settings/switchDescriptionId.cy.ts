import { selectors } from '@kaoto/kaoto/testing';

describe('Tests for switching description and ID in settings page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  // Reset nodeLabel to description
  after(() => {
    cy.openSettings();
    cy.selectInTypeaheadField('nodeLabel', 'description');
    cy.get(selectors.SETTINGS_FORM_SAVE_BTN).click();
    cy.waitSchemasLoading();
  });

  it('User switches node label type description and ID to be displayed in canvas', () => {
    cy.uploadFixture('flows/camelRoute/idDescriptionSettings.yaml');
    cy.openSettings();
    cy.selectInTypeaheadField('nodeLabel', 'id');
    cy.get(selectors.SETTINGS_FORM_SAVE_BTN).click();
    cy.waitSchemasLoading();
    cy.openDesignPage();

    cy.checkNodeExist('idTimer', 1);
    cy.checkNodeExist('descriptionSetHeader', 1);
    cy.checkNodeExist('idMarshal', 1);
    cy.checkNodeExist('log', 1);

    cy.openSettings();
    cy.selectInTypeaheadField('nodeLabel', 'description');
    cy.get(selectors.SETTINGS_FORM_SAVE_BTN).click();
    cy.waitSchemasLoading();
    cy.openDesignPage();

    cy.checkNodeExist('descriptionTimer', 1);
    cy.checkNodeExist('descriptionSetHeader', 1);
    cy.checkNodeExist('marshal', 1);
    cy.checkNodeExist('log', 1);
  });
});
