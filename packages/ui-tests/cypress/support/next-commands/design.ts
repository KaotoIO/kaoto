Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step, stepIndex) => {
  stepIndex = stepIndex ?? 0;
  cy.contains('text', `${step}`).parent().eq(stepIndex).click();
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('.pf-topology-side-bar').within(() => {
    cy.get('.pf-v5-c-card__title-text > .pf-v5-c-button').click();
  });
  cy.get('.pf-topology-side-bar').should('be.hidden');
});

Cypress.Commands.add('interactWithConfigInputObject', (inputName, value) => {
  if (value !== undefined && value !== null) {
    cy.get(`input[name="${inputName}"]`).clear().type(value);
  } else {
    cy.get(`input[name="${inputName}"]`).click();
  }
});
