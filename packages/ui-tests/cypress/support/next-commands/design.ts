Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step, stepIndex) => {
  stepIndex = stepIndex ?? 0;
  cy.contains('text', `${step}`).parent().eq(stepIndex).click();
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('[data-testid="close-side-bar"]').click();
  cy.get('.pf-topology-side-bar').should('be.hidden');
});

Cypress.Commands.add('interactWithConfigInputObject', (inputName, value) => {
  if (value !== undefined && value !== null) {
    cy.get(`input[name="${inputName}"]`).clear().type(value);
  } else {
    cy.get(`input[name="${inputName}"]`).click();
  }
});

Cypress.Commands.add('removeNodeByName', (inputName: string) => {
  cy.get('g.pf-topology__node__label')
    .contains('text', inputName)
    .parent()
    .find('g.pf-topology__node__action-icon > rect')
    .click({ force: true });
  cy.get('[data-testid="context-menu-item-remove"]').click();
  cy.get(inputName).should('not.exist');
});
