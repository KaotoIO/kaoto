Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step: string, stepIndex?: number) => {
  stepIndex = stepIndex ?? 0;
  cy.get('g.pf-topology__node__label')
    .find(':contains(' + step + ')')
    .eq(stepIndex)
    .click({ force: true });
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('[data-testid="close-side-bar"]').click();
  cy.get('.pf-topology-side-bar').should('be.hidden');
});

Cypress.Commands.add('interactWithExpressinInputObject', (inputName: string, value?: string) => {
  cy.get('[data-testid="expression-config-card"]').within(() => {
    cy.interactWithConfigInputObject(inputName, value);
  });
});

Cypress.Commands.add('interactWithDataformatInputObject', (inputName: string, value?: string) => {
  cy.get('[data-testid="dataformat-config-card"]').within(() => {
    cy.interactWithConfigInputObject(inputName, value);
  });
});

Cypress.Commands.add('interactWithConfigInputObject', (inputName: string, value?: string) => {
  if (value !== undefined && value !== null) {
    cy.get(`input[name="${inputName}"]`).clear();
    cy.get(`input[name="${inputName}"]`).type(value);
  } else {
    cy.get(`input[name="${inputName}"]`).click();
  }
});

Cypress.Commands.add('checkConfigCheckboxObject', (inputName: string, value: boolean) => {
  const checked = value ? '' : 'not.';
  cy.get(`input[name="${inputName}"]`).should(`${checked}be.checked`);
});

Cypress.Commands.add('checkConfigInputObject', (inputName: string, value: string) => {
  cy.get(`input[name="${inputName}"]`).should('have.value', value);
});

Cypress.Commands.add('removeNodeByName', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'remove', nodeIndex);
  cy.get(nodeName).should('not.exist');
});

Cypress.Commands.add('selectReplaceNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'replace', nodeIndex);
});

Cypress.Commands.add('selectAppendNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'append', nodeIndex);
});

Cypress.Commands.add('selectInsertSpecialNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'insert-special', nodeIndex);
});

Cypress.Commands.add('selectPrependNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'prepend', nodeIndex);
});

// allowed actions - append, prepend, replace, remove
Cypress.Commands.add('performNodeAction', (nodeName: string, action: string, nodeIndex?: number) => {
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

Cypress.Commands.add('selectExpression', (expression: string) => {
  cy.selectCustomMetadataEditor('expression', expression);
});

Cypress.Commands.add('selectDataformat', (dataformat: string) => {
  cy.selectCustomMetadataEditor('dataformat', dataformat);
});

Cypress.Commands.add('selectCustomMetadataEditor', (type: string, format: string) => {
  cy.get(`div[data-testid="${type}-config-card"] button.pf-v5-c-menu-toggle`).should('be.visible').click();
  const regex = new RegExp(`^${format}$`);
  cy.get('span.pf-v5-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});
