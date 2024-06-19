Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step: string, stepIndex?: number) => {
  stepIndex = stepIndex ?? 0;
  cy.get(`[data-nodelabel="${step}"]`).eq(stepIndex).click({ force: true });
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('[data-testid="close-side-bar"]').click();
  cy.get('.pf-topology-resizable-side-bar').should('not.exist');
});

Cypress.Commands.add('removeNodeByName', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'delete', nodeIndex);
  cy.get('body').then(($body) => {
    if ($body.find('.pf-m-danger').length) {
      // Delete Confirmation Modal appeared, click on the confirm button
      cy.get('.pf-m-danger').click();
    }
  });
  cy.get(nodeName).should('not.exist');
  // wait for the canvas rerender
  cy.wait(1000);
});

Cypress.Commands.add('selectReplaceNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'replace', nodeIndex);
});

Cypress.Commands.add('selectAppendNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'append', nodeIndex);
});

Cypress.Commands.add('selectDisableNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'disable', nodeIndex);
});

Cypress.Commands.add('selectInsertNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'insert', nodeIndex);
});

Cypress.Commands.add('selectInsertSpecialNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'insert-special', nodeIndex);
});

Cypress.Commands.add('selectPrependNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'prepend', nodeIndex);
});

Cypress.Commands.add('chooseFromCatalog', (_nodeType: string, name: string) => {
  cy.get(`input[placeholder="Filter by name, description or tag"]`).click();
  cy.get(`input[placeholder="Filter by name, description or tag"]`).type(name);
  cy.get(`#${name}`).should('be.visible').click();
  // wait for the canvas rerender
  cy.wait(1000);
});

Cypress.Commands.add('performNodeAction', (nodeName: string, action: ActionType, nodeIndex?: number) => {
  nodeIndex = nodeIndex ?? 0;
  cy.get(`[data-nodelabel="${nodeName}"]`).parent().eq(nodeIndex).rightclick({ force: true });
  cy.get(`[data-testid="context-menu-item-${action}"]`).click();
});

Cypress.Commands.add('checkNodeExist', (inputName, nodesCount) => {
  nodesCount = nodesCount ?? 1;
  cy.get(`[data-nodelabel="${inputName}"]`).should('have.length', nodesCount);
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

Cypress.Commands.add('selectCamelRouteType', (type: string, subType?: string) => {
  cy.get('[data-testid="new-entity-list-dropdown"]').click({ force: true });
  if (subType) {
    cy.get('ul.pf-v5-c-menu__list')
      .should('exist')
      .find(`[data-testid="new-entity-${type}"]`)
      .should('exist')
      .trigger('mouseover');
  }
  subType = subType ?? type;
  cy.get(`[data-testid="new-entity-${subType}"] button.pf-v5-c-menu__item`).click({ force: true });
});
