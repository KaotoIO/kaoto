Cypress.Commands.add('fitToScreen', () => {
  cy.get('.fit-to-screen').click();
});

Cypress.Commands.add('openStepConfigurationTab', (step: string, stepIndex?: number) => {
  stepIndex = stepIndex ?? 0;
  cy.get(`g[data-nodelabel^="${step}"]`).eq(stepIndex).click({ force: true });
});

Cypress.Commands.add('openStepConfigurationTabByPath', (path: string) => {
  cy.get(`g[data-testid="${path}"]`).click({ force: true });
});

Cypress.Commands.add('openGroupConfigurationTab', (group: string, groupIndex?: number) => {
  groupIndex = groupIndex ?? 0;
  cy.get(`g[data-grouplabel^="${group}"]`).eq(groupIndex).click({ force: true });
});

Cypress.Commands.add('toggleExpandGroup', (groupName: string) => {
  cy.get(`span[title="${groupName}"]`).click({ force: true });
  cy.get(`[data-testid="step-toolbar-button-collapse"]`).click({ force: true });
});

Cypress.Commands.add('closeStepConfigurationTab', () => {
  cy.get('[data-testid="close-side-bar"]').click({ force: true });
  cy.get('.pf-topology-resizable-side-bar').should('not.exist');
});

Cypress.Commands.add('removeNodeByName', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'delete', nodeIndex);
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="action-confirmation-modal-btn-confirm"]').length) {
      // Delete Confirmation Modal appeared, click on the confirm button
      cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();
    }
  });
  cy.get(nodeName).should('not.exist');
  // wait for the canvas rerender
  cy.wait(1000);
});

Cypress.Commands.add('quickAppendStep', (path: string) => {
  cy.get(`[data-testid="placeholder-node__${path}"]`).click({ force: true });
});

Cypress.Commands.add('selectDuplicateNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'duplicate', nodeIndex);
});

Cypress.Commands.add('selectMoveBeforeNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'move-before', nodeIndex);
});

Cypress.Commands.add('selectMoveAfterNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'move-next', nodeIndex);
});

Cypress.Commands.add('selectReplaceNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'replace', nodeIndex);
});

Cypress.Commands.add('selectCopyNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'copy', nodeIndex);
});

Cypress.Commands.add('selectPasteNode', (nodeName: string, pasteType: string, nodeIndex?: number) => {
  if (pasteType === 'paste-as-child') {
    cy.performNodeAction(nodeName, `paste-as-child`, nodeIndex);
  } else if (pasteType === 'paste-as-special-child') {
    cy.performNodeAction(nodeName, `paste-as-special-child`, nodeIndex);
  } else if (pasteType === 'paste-as-next-step') {
    cy.performNodeAction(nodeName, `paste-as-next-step`, nodeIndex);
  }
});

Cypress.Commands.add('selectAppendNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'append', nodeIndex);
});

Cypress.Commands.add('selectDisableNode', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'disable', nodeIndex);
});

Cypress.Commands.add('selectEnableAllNodes', (nodeName: string, nodeIndex?: number) => {
  cy.performNodeAction(nodeName, 'enable-all', nodeIndex);
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

Cypress.Commands.add('selectRemoveGroup', (groupName: string, groupIndex?: number) => {
  cy.performNodeAction(groupName, 'container-remove', groupIndex);
});

Cypress.Commands.add('chooseFromCatalog', (_nodeType: string, name: string) => {
  cy.get(`input[placeholder="Filter by name, description or tag"]`).click();
  cy.get(`input[placeholder="Filter by name, description or tag"]`).type(name);
  cy.get(`#${name}`).should('be.visible').click();
  // wait for the canvas rerender
  cy.wait(1000);
});

Cypress.Commands.add('checkCatalogEntryExists', (_nodeType: string, name: string) => {
  cy.get(`input[placeholder="Filter by name, description or tag"]`).clear().type(name);
  cy.get(`#${name}`).should('exist');
});

Cypress.Commands.add('checkCatalogEntryNotExists', (_nodeType: string, name: string) => {
  cy.get(`input[placeholder="Filter by name, description or tag"]`).clear().type(name);
  cy.get(`#${name}`).should('not.exist');
});

Cypress.Commands.add('closeCatalogModal', () => {
  cy.get('[data-ouia-component-id="CatalogModal-ModalBoxCloseButton"]').click();
});

Cypress.Commands.add('performNodeAction', (nodeName: string, action: ActionType, nodeIndex?: number) => {
  nodeIndex = nodeIndex ?? 0;
  cy.get(`foreignObject[data-nodelabel="${nodeName}"]`).eq(nodeIndex).rightclick({ force: true });
  cy.get(`[data-testid="context-menu-item-${action}"]`).click();
});

Cypress.Commands.add('checkNodeExist', (inputName, nodesCount) => {
  nodesCount = nodesCount ?? 1;
  cy.get(`foreignObject[data-nodelabel="${inputName}"]`).should('have.length', nodesCount);
});

Cypress.Commands.add('checkEdgeExists', (scope: string, sourceName: string, targetName: string) => {
  const idPattern = `${scope}|${sourceName} >>> ${targetName}`;
  // Check if an element with the matching id exists
  cy.get('g').should(($elements) => {
    // Use Cypress commands to check if any element matches the id pattern
    const matchingElementExists = $elements.toArray().some((element) => {
      const dataId = Cypress.$(element).attr('data-id');
      return dataId === idPattern;
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
    cy.get('ul.pf-v6-c-menu__list')
      .should('exist')
      .find(`[data-testid="new-entity-${type}"]`)
      .should('exist')
      .trigger('mouseover');
  }
  subType = subType ?? type;
  cy.get(`[data-testid="new-entity-${subType}"] button.pf-v6-c-menu__item`).click({ force: true });
});

Cypress.Commands.add('selectRuntimeVersion', (type: string) => {
  cy.hoverOnRuntime(type);
  cy.get(`[data-testid^="runtime-selector-Camel ${type}"] button.pf-v6-c-menu__item`).first().click({ force: true });
  cy.waitSchemasLoading();

  cy.get('[data-testid="visualization-empty-state"]').should('exist');
  // Wait for the element to become visible
  cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
});

Cypress.Commands.add('hoverOnRuntime', (type: string) => {
  cy.get('[data-testid="runtime-selector-list-dropdown"]').click({ force: true });
  cy.get('ul.pf-v6-c-menu__list')
    .should('exist')
    .find(`[data-testid="runtime-selector-${type}"]`)
    .should('exist')
    .trigger('mouseover');
});

Cypress.Commands.add('checkCatalogVersion', (version?: string) => {
  cy.get('.pf-v6-c-card__title-text')
    .eq(0)
    .within(() => {
      cy.get('.pf-v6-c-label__text').should('contain', version);
    });
});

Cypress.Commands.add('switchCodeToXml', () => {
  cy.get('[data-testid="serializer-list-dropdown"]').click();
  cy.get('[data-testid="serializer-yaml"]').contains('XML').click();
});

Cypress.Commands.add('switchCodeToYaml', () => {
  cy.get('[data-testid="serializer-list-dropdown"]').click();
  cy.get('[data-testid="serializer-yaml"]').contains('YAML').click();
});

Cypress.Commands.add('checkDarkMode', () => {
  cy.get('html').should('have.class', 'pf-v6-theme-dark');
});

Cypress.Commands.add('checkLightMode', () => {
  cy.get('html').should('not.have.class', 'pf-v6-theme-dark');
});

Cypress.Commands.add('DnDOnNode', (sourceNodeName: string, targetNodeName: string) => {
  const sourceNode = cy.get(`[data-testid="${sourceNodeName}"]`);
  const targetNode = cy.get(`[data-testid="${targetNodeName}"]`);

  sourceNode.realMouseDown({ button: 'left', position: 'center' }).realMouseMove(0, 0, { position: 'center' });
  targetNode.realMouseMove(0, 0, { position: 'center' }).realMouseUp();
});

Cypress.Commands.add('DnDOnEdge', (sourceNodeName: string, targetEdgeName: string) => {
  const sourceNode = cy.get(`[data-testid="${sourceNodeName}"]`);
  const targetEdge = cy.get(`[data-id="${targetEdgeName}"]`);

  sourceNode.realMouseDown({ button: 'left', position: 'center' }).realMouseMove(0, 0, { position: 'center' });
  targetEdge.realMouseMove(0, 0, { position: 'center' }).realMouseUp();
});
