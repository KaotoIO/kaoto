import { selectors } from '@kaoto/kaoto/testing';

describe('Catalog related tests', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Catalog search', () => {
    cy.openCatalog();
    cy.get(selectors.PROCESSOR_CATALOG_TAB).click();
    cy.get(selectors.KAMELET_CATALOG_TAB).click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).type('timer');
    cy.get('div[id="timer"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).should('have.value', '');

    cy.get(selectors.COMPONENT_CATALOG_TAB).click();
    cy.get(selectors.PROCESSOR_CATALOG_TAB).click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).type('choice');
    cy.get('div[id="choice"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).should('have.value', '');

    cy.get(selectors.PROCESSOR_CATALOG_TAB).click();
    cy.get(selectors.KAMELET_CATALOG_TAB).click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).type('aws secret');
    cy.get('div[id="aws-secrets-manager-sink"]').should('be.visible');
    cy.get('button[aria-label="Reset"]').click();
    cy.get(selectors.INPUT_GROUP_TEXT_INPUT).should('have.value', '');
  });

  it('Catalog filtering using tags', () => {
    cy.openCatalog();
    cy.get(selectors.PROCESSOR_CATALOG_TAB).click();
    cy.get(selectors.KAMELET_CATALOG_TAB).click();
    cy.get('[data-testid="tag-cloud"]').first().click();
    cy.get('[data-testid="tag-database"]').first().click();
    cy.get('[data-testid="tag-serverless"]').first().click();

    cy.get('[data-testid="tile-aws2-redshift-data"]').should('be.visible');

    cy.get('[data-testid="button-catalog-tag-cloud"]').click();
    cy.get('[data-testid="button-catalog-tag-database"]').click();
    cy.get('[data-testid="button-catalog-tag-serverless"]').click();
    cy.contains('h2', 'Showing 1 elements').should('not.exist');
  });

  it('Catalog list view switch check', () => {
    cy.openCatalog();
    cy.get(selectors.TOGGLE_LAYOUT_BUTTON_LIST).click();
    cy.get(selectors.COMPONENT_CATALOG_TAB).click();
    cy.get(selectors.PROCESSOR_CATALOG_TAB).click();
    cy.get(selectors.TOGGLE_LAYOUT_BUTTON_GALLERY).should('have.attr', 'aria-pressed', 'false');
    cy.openSourceCode();
    cy.openCatalog();
    cy.get(selectors.TOGGLE_LAYOUT_BUTTON_GALLERY).should('have.attr', 'aria-pressed', 'false');
    cy.get(selectors.TOGGLE_LAYOUT_BUTTON_GALLERY).click();
    cy.get(selectors.PROCESSOR_CATALOG_TAB).click({ force: true });
    cy.get(selectors.KAMELET_CATALOG_TAB).click({ force: true });
    cy.get(selectors.TOGGLE_LAYOUT_BUTTON_GALLERY).should('have.attr', 'aria-pressed', 'true');
  });
});
