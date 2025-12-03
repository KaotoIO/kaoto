Cypress.Commands.add('attachSourceBodySchema', (filePath: string) => {
  const sourceBodyPanel = '.source-panel [data-top-handle="true"]';

  // Click attach button within the source body panel
  cy.get(sourceBodyPanel, { timeout: 10000 })
    .scrollIntoView()
    .should('be.visible')
    .find('[data-testid="attach-schema-sourceBody-Body-button"]')
    .click();

  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
  cy.get('[data-testid="attach-schema-modal-text"]').invoke('val').should('not.be.empty');
  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();

  // Verify panel expanded and document is visible
  cy.get(sourceBodyPanel)
    .should('have.attr', 'data-expanded', 'true')
    .find('[data-testid="document-doc-sourceBody-Body"]')
    .should('be.visible');
});

Cypress.Commands.add('attachTargetBodySchema', (filePath: string) => {
  // Find attach button within target panel
  cy.get('.target-panel').find('[data-testid="attach-schema-targetBody-Body-button"]').click();
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);

  cy.get('[data-testid="attach-schema-modal-text"]').invoke('val').should('not.be.empty');
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('not.be.checked');
  } else {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('not.be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('be.checked');
  }

  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();

  // Verify the target body document is visible within target panel
  cy.get('.target-panel').find('[data-testid="document-doc-targetBody-Body"]').should('be.visible');
});

Cypress.Commands.add('expandSourceBodyPanel', () => {
  const sourceBodyPanel = '.source-panel [data-top-handle="true"]';

  cy.get(sourceBodyPanel).then(($panel) => {
    if ($panel.attr('data-expanded') === 'false') {
      cy.wrap($panel).find('.expansion-panel__summary').click();
      cy.get(sourceBodyPanel).should('have.attr', 'data-expanded', 'true');
      // Wait for tree nodes to render
      cy.get(sourceBodyPanel).find('[data-testid^="node-source-"]', { timeout: 10000 }).should('exist');
      cy.wait(300);
    }
  });

  // Scroll into view once at the end, regardless of whether we expanded or not
  cy.get(sourceBodyPanel).scrollIntoView();
});

Cypress.Commands.add('expandParameterPanel', (name: string) => {
  const parameterPanelSelector = `[data-testid="document-doc-param-${name}"]`;

  cy.get(parameterPanelSelector, { timeout: 10000 })
    .parents('.expansion-panel')
    .then(($panel) => {
      if ($panel.attr('data-expanded') === 'false') {
        cy.wrap($panel).find('.expansion-panel__summary').click();
        cy.wrap($panel).should('have.attr', 'data-expanded', 'true');
        // Wait for tree nodes to render
        cy.wrap($panel).find('[data-testid^="node-source-"]', { timeout: 10000 }).should('exist');
        cy.wait(300);
      }
    });

  // Scroll into view once at the end, regardless of whether we expanded or not
  cy.get(parameterPanelSelector).scrollIntoView();
});

Cypress.Commands.add('addParameter', (name: string) => {
  cy.get('[data-testid="add-parameter-button"]').click();
  cy.get('[data-testid="new-parameter-name-input"]').type(name);
  cy.get('[data-testid="new-parameter-submit-btn"]').click();
});

Cypress.Commands.add('deleteParameter', (name: string) => {
  cy.get(`[data-testid="delete-parameter-${name}-button"]`).click();
  cy.get('[data-testid="delete-parameter-modal-confirm-btn"]').click();
});

Cypress.Commands.add('attachParameterSchema', (name: string, filePath: string) => {
  const attachButtonSelector = `[data-testid="attach-schema-param-${name}-button"]`;

  // Click attach button
  cy.get(attachButtonSelector, { timeout: 10000 }).scrollIntoView().should('be.visible').click();

  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);

  cy.get('[data-testid="attach-schema-modal-text"]').invoke('val').should('not.be.empty');
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('not.be.checked');
  } else {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('not.be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('be.checked');
  }

  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();

  // Verify parameter panel expanded and document is visible
  cy.get(`[data-testid="document-doc-param-${name}"]`, { timeout: 10000 })
    .should('be.visible')
    .parents('.expansion-panel')
    .should('have.attr', 'data-expanded', 'true');
});

Cypress.Commands.add('detachParameterSchema', (name: string) => {
  cy.get(`[data-testid="detach-schema-param-${name}-button"]`).click();
  cy.get('[data-testid="detach-schema-modal-confirm-btn"]').click();
});

Cypress.Commands.add('importMappings', (filePath: string) => {
  cy.get('[data-testid="dm-debug-main-menu-button"]').click();
  cy.get('[data-testid="dm-debug-import-mappings-button"]').click();
  cy.get('[data-testid="dm-debug-import-mappings-file-input"]').attachFile(filePath);
});

Cypress.Commands.add('exportMappings', () => {
  cy.get('[data-testid="dm-debug-main-menu-button"]').click();
  cy.get('[data-testid="dm-debug-export-mappings-button"]').click();
  cy.get('[data-testid="dm-debug-export-mappings-modal"]').should('be.visible');
});

Cypress.Commands.add('closeExportMappingsModal', () => {
  cy.get('[data-testid="dm-debug-export-mappings-modal-close-btn"]').click();
});

Cypress.Commands.add('resetMappings', () => {
  cy.get('[data-testid="dm-debug-main-menu-button"]').click();
  cy.get('[data-testid="dm-debug-reset-mappings-button"]').click();
});

Cypress.Commands.add('checkFieldSelected', (type: string, format: string, fieldName: string, selected: boolean) => {
  cy.get(`[data-testid^="node-${type}-${format}-${fieldName}"]`)
    .should('be.visible')
    .and('have.attr', 'data-selected', selected.toString());
});

Cypress.Commands.add('checkMappingLineSelected', (selected: boolean) => {
  cy.get('[data-testid^="mapping-link-selected"]').should(selected ? 'be.visible' : 'not.exist');
});

Cypress.Commands.add('countMappingLines', (num: number) => {
  cy.get('[data-testid^="mapping-link-"]').should('have.length', num);
});

// Internal helper - scopes queries to a specific panel
Cypress.Commands.add('getDataMapperNode', (nodePath: string[], panelClass?: string) => {
  const panel = panelClass ? cy.get(panelClass) : cy;

  // First, find the document element (root of the path)
  const documentElement = panel.find(`[data-testid="${nodePath[0]}"]`);

  // If there are no child nodes in the path, return the document element
  if (nodePath.length === 1) {
    return documentElement;
  }

  // For child nodes, check if we're in an expansion panel context (source panel)
  // or a simple structure (target panel)
  return documentElement.then(($doc) => {
    const $expansionPanel = $doc.parents('.expansion-panel');

    if ($expansionPanel.length > 0) {
      // Source panel: Has expansion panels, search within the expansion panel container
      return nodePath.slice(1).reduce((acc, nodeId) => {
        return acc.find(`[data-testid^="${nodeId}"]`);
      }, cy.wrap($expansionPanel));
    } else {
      // Target panel: No expansion panels, search from document element's parent
      return nodePath.slice(1).reduce((acc, nodeId) => {
        return acc.find(`[data-testid^="${nodeId}"]`);
      }, documentElement.parent());
    }
  });
});

// Public API - self-documenting panel-scoped commands
Cypress.Commands.add('getDataMapperSourceNode', (nodePath: string[]) => {
  return cy.getDataMapperNode(nodePath, '.source-panel');
});

Cypress.Commands.add('getDataMapperTargetNode', (nodePath: string[]) => {
  return cy.getDataMapperNode(nodePath, '.target-panel');
});

Cypress.Commands.add('engageMapping', (sourceNodePath: string[], targetNodePath: string[], testXPath: string) => {
  const dataTransfer = new DataTransfer();

  const sourceNode = cy.getDataMapperSourceNode(sourceNodePath);
  const targetNode = cy.getDataMapperTargetNode(targetNodePath);

  sourceNode
    .find('[id^="draggable-"]')
    .first()
    .trigger('mouseenter', { dataTransfer, force: true })
    .trigger('mouseover', { dataTransfer, force: true })
    .trigger('mousedown', { dataTransfer, force: true });

  targetNode.find('[id^="droppable-"]').first().trigger('mousemove', { dataTransfer, force: true });

  cy.get('.source-panel').find('[data-dnd-draggable]').should('exist');

  targetNode
    .trigger('mouseenter', { dataTransfer, force: true })
    .trigger('mouseover', { dataTransfer, force: true })
    .trigger('mousemove', { dataTransfer, force: true });

  cy.get('.target-panel').find('[data-dnd-droppable]').should('exist');

  targetNode.trigger('mouseup', { dataTransfer, force: true });

  // Wait for the mapping to be processed and transformation inputs to update
  cy.wait(300);
  cy.get('[data-testid="transformation-xpath-input"]', { timeout: 10000 }).should(($inputs) => {
    // Get all input values (there may be multiple inputs for different target nodes)
    const allValues = $inputs.toArray().map((el) => el.value);
    const found = allValues.some((value) => value.includes(testXPath));

    expect(
      found,
      `Expected XPath "${testXPath}" to appear in transformation inputs. Found values: ${JSON.stringify(allValues)}`,
    ).to.be.true;
  });
});

Cypress.Commands.add(
  'engageForEachMapping',
  (sourceNodePath: string[], targetNodePath: string[], testXPath: string) => {
    const targetNode = cy.getDataMapperTargetNode(targetNodePath);
    targetNode.find('[data-testid="transformation-actions-menu-toggle"]').first().click();
    cy.get('[data-testid="transformation-actions-foreach"]').click();

    const updatedTargetNodePath = [...targetNodePath.slice(0, targetNodePath.length - 1), 'node-target-for-each'];
    cy.engageMapping(sourceNodePath, updatedTargetNodePath, testXPath);
  },
);
