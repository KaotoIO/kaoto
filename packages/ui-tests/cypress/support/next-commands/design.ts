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

Cypress.Commands.add('removeNodeByName', (nodeName: string, nodeIndex: number) => {
  cy.performNodeAction(nodeName, 'remove', nodeIndex);
  cy.get(nodeName).should('not.exist');
});

Cypress.Commands.add('selectReplaceNode', (nodeName: string, nodeIndex: number) => {
  cy.performNodeAction(nodeName, 'replace', nodeIndex);
});

Cypress.Commands.add('selectAppendNode', (nodeName: string, nodeIndex: number) => {
  cy.performNodeAction(nodeName, 'append', nodeIndex);
});

Cypress.Commands.add('selectInsertSpecialNode', (nodeName: string, nodeIndex: number) => {
  cy.performNodeAction(nodeName, 'insert-special', nodeIndex);
});

Cypress.Commands.add('selectPrependNode', (nodeName: string, nodeIndex: number) => {
  cy.performNodeAction(nodeName, 'prepend', nodeIndex);
});

// allowed actions - append, prepend, replace, remove
Cypress.Commands.add('performNodeAction', (nodeName: string, action: string, nodeIndex: number) => {
  nodeIndex = nodeIndex ?? 0;
  cy.get('g.pf-topology__node__label')
    .find(':contains(' + nodeName + ')')
    .eq(nodeIndex)
    .parent()
    .find('g.pf-topology__node__action-icon > rect')
    .click({ force: true });
  cy.get(`[data-testid="context-menu-item-${action}"]`).click();
});

Cypress.Commands.add('checkNodeExist', (inputName, nodesCount) => {
  nodesCount = nodesCount ?? 1;
  cy.get('g.pf-topology__node__label')
    .find(':contains(' + inputName + ')')
    .should('have.length', nodesCount);
});

Cypress.Commands.add('checkEdgeExists', (sourceName: string, targetName: string) => {
  const idPattern = sourceName + '-\\d+-to-' + targetName + '-\\d+';
  // Check if an element with the matching id exists
  cy.get('g').should(($elements) => {
    // Use Cypress commands to check if any element matches the id pattern
    const matchingElementExists = $elements.toArray().some((element) => {
      const dataId = Cypress.$(element).attr('data-id');
      return dataId && dataId.match(idPattern);
    });
    // Assert that at least one matching element exists
    expect(matchingElementExists).to.be.true;
  });
});

Cypress.Commands.add('deleteBranch', (branchIndex) => {
  branchIndex = branchIndex ?? 0;
  cy.get('[data-testid="stepNode__deleteBranch-btn"]').eq(branchIndex).click();
  cy.get('[data-testid="confirmDeleteBranchDialog__btn"]').click();
});
