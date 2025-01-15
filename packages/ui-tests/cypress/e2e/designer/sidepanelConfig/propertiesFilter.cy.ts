import { selectors } from '@kaoto/kaoto/testing';

describe('Tests for side panel step filtering', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Side panel step filtering lowercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(selectors.EXPRESSION_METADATA_EDITOR).should('exist');
    cy.get(selectors.CARD_HEADER_TOGGLE).click();

    // filter fields
    cy.filterFields('name');
    cy.get(selectors.EXPRESSION_METADATA_EDITOR).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="disabled"]`).should('not.exist');
  });

  it('Side panel step filtering uppercase', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');

    // expand wrapped section
    cy.contains('button', 'Processor advanced properties').click();

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="name"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(selectors.EXPRESSION_METADATA_EDITOR).should('exist');
    cy.get(selectors.CARD_HEADER_TOGGLE).click();

    // filter fields
    cy.filterFields('DISABLED');
    cy.get(selectors.EXPRESSION_METADATA_EDITOR).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');
    cy.get(`input[name="name"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });
  // reproducer for https://github.com/KaotoIO/kaoto/issues/1207
  it('Side panel step filtering multiple words', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');

    // check all fields are present
    cy.get(`input[name="id"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="disabled"]`).should('exist');

    // filter fields
    cy.filterFields('show all');
    cy.get(`input[name="parameters.showAll"]`).should('exist');
    cy.get(`input[name="parameters.showAllProperties"]`).should('exist');
    cy.get(`input[name="id"]`).should('not.exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
  });

  it('Side panel all fields / user modified filter', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('variableSend', 'testVariableSend');
    cy.interactWithConfigInputObject('variableReceive', 'testVariableReceive');

    cy.selectFormTab('Modified');

    cy.get(`input[name="variableSend"]`).should('exist');
    cy.get(`input[name="variableReceive"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');

    cy.selectFormTab('All');

    cy.get(`input[name="variableSend"]`).should('exist');
    cy.get(`input[name="variableReceive"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('exist');
    cy.get(`input[name="id"]`).should('exist');
  });

  it('Side panel required fields filter', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('timer');
    cy.selectFormTab('Required');

    cy.get(`input[name="parameters.timerName"]`).should('exist');
    cy.get(`textarea[name="description"]`).should('not.exist');
    cy.get(`input[name="id"]`).should('not.exist');

    cy.selectReplaceNode('marshal');
    cy.chooseFromCatalog('processor', 'transacted');
    cy.openStepConfigurationTab('transacted');

    cy.selectFormTab('Required');

    cy.get(selectors.ALERT_TITLE).should('contain', 'No Required fields found');
  });

  it('Side panel to retain user specified fields filter', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('log');
    cy.selectFormTab('All');

    cy.openStepConfigurationTab('timer');

    cy.specifiedFormTab('All');
    cy.selectFormTab('Required');

    cy.openStepConfigurationTab('log');
    cy.specifiedFormTab('Required');
    cy.selectFormTab('Modified');

    cy.closeStepConfigurationTab();
    cy.openStepConfigurationTab('timer');
    cy.specifiedFormTab('Modified');
  });
});
