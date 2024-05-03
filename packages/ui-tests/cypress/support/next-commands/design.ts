Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step: string, stepIndex?: number) => {
  stepIndex = stepIndex ?? 0;
  cy.get(`[data-nodelabel="${step}"]`).eq(stepIndex).click({ force: true });
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('[data-testid="close-side-bar"]').click();
  cy.get('.pf-topology-side-bar').should('be.hidden');
});

Cypress.Commands.add('interactWithExpressinInputObject', (inputName: string, value?: string) => {
  cy.get('[data-ouia-component-id="ExpressionModal"]').within(() => {
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
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).clear();
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).type(value);
  } else {
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).click();
  }
});

Cypress.Commands.add('checkConfigCheckboxObject', (inputName: string, value: boolean) => {
  const checked = value ? '' : 'not.';
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should(`${checked}be.checked`);
});

Cypress.Commands.add('checkConfigInputObject', (inputName: string, value: string) => {
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should('have.value', value);
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
  cy.get('.pf-v5-c-text-input-group__text-input').click();
  cy.get('.pf-v5-c-text-input-group__text-input').type(name);
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

Cypress.Commands.add('openExpressionModal', () => {
  cy.get('[data-testid="launch-expression-modal-btn"]').should('be.visible').click();
});

Cypress.Commands.add('confirmExpressionModal', () => {
  cy.get('[data-testid="confirm-expression-modal-btn"]').should('be.visible').click();
});

Cypress.Commands.add('cancelExpressionModal', () => {
  cy.get('[data-testid="cancel-expression-modal-btn"]').should('be.visible').click();
});

Cypress.Commands.add('selectExpression', (expression: string) => {
  cy.get('div[data-ouia-component-id="ExpressionModal"] button.pf-v5-c-menu-toggle__button')
    .should('be.visible')
    .click();
  const regex = new RegExp(`^${expression}$`);
  cy.get('span.pf-v5-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});

Cypress.Commands.add('selectDataformat', (dataformat: string) => {
  cy.selectCustomMetadataEditor('dataformat', dataformat);
});

Cypress.Commands.add('selectCustomMetadataEditor', (type: string, format: string) => {
  cy.get(`div[data-testid="${type}-config-card"] div.pf-v5-c-menu-toggle button.pf-v5-c-menu-toggle__button`)
    .should('be.visible')
    .click();
  const regex = new RegExp(`^${format}$`);
  cy.get('span.pf-v5-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});

Cypress.Commands.add('configureNewBeanReference', (inputName: string) => {
  cy.get(`[data-fieldname="${inputName}"]`).scrollIntoView();
  cy.get(`[data-fieldname="${inputName}"] input`).click();
  cy.get('#select-typeahead-kaoto-create-new').click();
});

Cypress.Commands.add('configureBeanReference', (inputName: string, value?: string) => {
  cy.get(`[data-fieldname="${inputName}"]`).scrollIntoView();
  cy.get(`[data-fieldname="${inputName}"] input`).click();
  cy.get(`[id$="${value}"]`).click();
  cy.get(`div[data-fieldname="${inputName}"] input[value="${value}"]`).should('exist');
});

Cypress.Commands.add('configureDropdownValue', (inputName: string, value?: string) => {
  cy.configureBeanReference(inputName, value!);
});

Cypress.Commands.add('deselectNodeBean', (inputName: string) => {
  cy.get(`div[data-fieldname="${inputName}"] button[aria-label="Clear input value"]`).click();
});
