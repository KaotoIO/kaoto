Cypress.Commands.add('attachSourceBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-sourceBody-Body-button"]').click();
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
  cy.get('[data-testid="attach-schema-file-list"]').should('exist');
  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();
  // Verify schema was attached by checking for child nodes in source body
  cy.get('.source-panel').find('[data-testid^="node-source-"]').should('exist');
  // Wait for panel heights to stabilize after schema attachment
  cy.wait(100);
});

Cypress.Commands.add('attachTargetBodySchema', (filePath: string | string[]) => {
  cy.addTargetBodySchema(filePath);

  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();

  // Verify schema was attached by checking for child nodes in target body
  cy.get('.target-panel').find('[data-testid^="node-target-"]').should('exist');
  // Wait for panel heights to stabilize after schema attachment
  cy.wait(100);
});

Cypress.Commands.add('addTargetBodySchema', (filePath: string | string[]) => {
  // Normalize input to array for consistent processing
  const filePaths = Array.isArray(filePath) ? filePath : [filePath];

  cy.get('[data-testid="attach-schema-targetBody-Body-button"]').click();
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();

  // Attach each file
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePaths);

  cy.get('[data-testid="attach-schema-file-list"]').should('exist');

  // Check file type based on the first file
  const firstFile = filePaths[0];
  if (firstFile.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('not.be.checked');
  } else {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('not.be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('be.checked');
  }
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
  cy.get(`[data-testid="attach-schema-param-${name}-button"]`).click();
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);

  cy.get('[data-testid="attach-schema-file-list"]').should('exist');
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('not.be.checked');
  } else {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('not.be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('be.checked');
  }

  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();
  // Wait for panel heights to stabilize after schema attachment
  cy.wait(100);
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
// For document nodes (document-doc-*), navigates up to the expansion panel wrapper
// to find child nodes since header and content are siblings in ExpansionPanel structure
Cypress.Commands.add('getDataMapperNode', (nodePath: string[], panelClass?: string) => {
  const panel = panelClass ? cy.get(panelClass) : cy;
  const firstNode = nodePath[0];

  // If the first node is a document, find it and navigate up to the expansion panel
  // so we can find child nodes that are in the content area (sibling of header)
  if (firstNode.startsWith('document-doc-')) {
    const expansionPanel = panel.find(`[data-testid="${firstNode}"]`).closest('.expansion-panel');

    return nodePath.slice(1).reduce((acc, nodeId) => {
      return acc.find(`[data-testid^="${nodeId}"]`);
    }, expansionPanel);
  }

  // For non-document nodes, use the original behavior
  return nodePath.slice(1).reduce(
    (acc, nodeId) => {
      return acc.find(`[data-testid^="${nodeId}"]`);
    },
    panel.find(`[data-testid="${nodePath[0]}"]`),
  );
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

  cy.getDataMapperTargetNode(targetNodePath)
    .find('[data-testid="transformation-xpath-input"]')
    .should('have.value', testXPath);
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
