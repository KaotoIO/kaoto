import { selectors } from '@kaoto/kaoto/testing';

describe('Test toolbar on hover actions', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Replace steps in using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');

    cy.get(selectors.STEP_TOOLBAR_BUTTON_REPLACE).click();
    cy.chooseFromCatalog('component', 'quartz');

    cy.checkNodeExist('quartz', 1);
  });

  it('Delete steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');

    cy.get(selectors.STEP_TOOLBAR_BUTTON_DELETE).click();

    cy.checkNodeExist('setHeader', 0);
  });

  it('Disable and Enable steps using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.get(selectors.STEP_TOOLBAR_BUTTON_DISABLE).click();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.checkConfigCheckboxObject('disabled', true);

    cy.openStepConfigurationTab('setHeader');
    cy.get(selectors.STEP_TOOLBAR_BUTTON_DISABLE).click();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.checkConfigCheckboxObject('disabled', false);
  });

  it('Delete route using hover toolbar', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openRootConfigurationTab('camel-route');

    cy.get(selectors.STEP_TOOLBAR_BUTTON_DELETE_GROUP).click();
    cy.get(selectors.ACTION_CONFIRMATION_MODAL_BTN_CONFIRM).click();

    cy.get(selectors.RF_NODE_NODE).should('have.length', 0);

    cy.get(selectors.FLOWS_LIST_ROUTE_COUNT).should('have.text', '0/0');
    cy.get(selectors.VISUALIZATION_EMPTY_STATE).should('be.visible');
  });

  it('Add branch using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openRootConfigurationTab('choice');

    cy.get(selectors.STEP_TOOLBAR_BUTTON_ADD_SPECIAL).click();

    cy.chooseFromCatalog('processor', 'when');
    cy.checkNodeExist('when', 4);
    cy.checkNodeExist('log', 2);
  });

  it('Collapse and unwrap container using hover toolbar', () => {
    cy.uploadFixture('flows/kamelet/complex.yaml');
    cy.openDesignPage();

    cy.openRootConfigurationTab('choice');

    cy.get(selectors.STEP_TOOLBAR_BUTTON_COLLAPSE).click({ force: true });
    cy.checkNodeExist('when', 0);
    cy.checkNodeExist('otherwise', 0);
    cy.checkNodeExist('log', 0);

    cy.get(selectors.STEP_TOOLBAR_BUTTON_COLLAPSE).click({ force: true });
    cy.checkNodeExist('when', 3);
    cy.checkNodeExist('otherwise', 1);
    cy.checkNodeExist('log', 1);
  });
});
