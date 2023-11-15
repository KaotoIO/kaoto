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

Cypress.Commands.add('removeNodeByName', (nodeName: string) => {
  cy.performNodeAction(nodeName, 'remove');
  cy.get(nodeName).should('not.exist');
});

Cypress.Commands.add('selectReplaceNode', (nodeName: string) => {
  cy.performNodeAction(nodeName, 'replace');
});

Cypress.Commands.add('selectAppendNode', (nodeName: string) => {
  cy.performNodeAction(nodeName, 'append');
});

Cypress.Commands.add('selectPrependNode', (nodeName: string) => {
  cy.performNodeAction(nodeName, 'prepend');
});

// allowed actions - append, prepend, replace, remove
Cypress.Commands.add('performNodeAction', (nodeName: string, action: string) => {
  cy.get('g.pf-topology__node__label')
    .contains('text', nodeName)
    .parent()
    .find('g.pf-topology__node__action-icon > rect')
    .click({ force: true });
  cy.get(`[data-testid="context-menu-item-${action}"]`).click();
});

Cypress.Commands.add('checkNodeExist', (inputName, nodesCount) => {
  nodesCount = nodesCount ?? 1;
  cy.get('g.pf-topology__node__label').contains('text', inputName).should('have.length', nodesCount);
});
