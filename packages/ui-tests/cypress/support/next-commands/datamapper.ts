Cypress.Commands.add('attachSourceBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-sourceBody-Body-button"]').click();
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
  cy.get('[data-testid="attach-schema-modal-text"]').invoke('val').should('not.be.empty');
  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();
  cy.get('.source-panel').find('[data-testid="expand-icon-Body"]').should('be.visible');
});

Cypress.Commands.add('attachTargetBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-targetBody-Body-button"]').click();
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

  cy.get('.target-panel').find('[data-testid="expand-icon-Body"]').should('be.visible');
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

  cy.get('[data-testid="attach-schema-modal-text"]').invoke('val').should('not.be.empty');
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('not.be.checked');
  } else {
    cy.get('[data-testid="attach-schema-modal-option-json"]').should('not.be.checked');
    cy.get('[data-testid="attach-schema-modal-option-xml"]').should('be.checked');
  }

  cy.get('[data-testid="attach-schema-modal-btn-attach"]').click();
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
  cy.get(`[data-testid^="node-${type}-${format}-${fieldName}`).should(selected ? 'not.exist' : 'be.visible');
  cy.get(`[data-testid^="node-${type}-selected-${format}-${fieldName}`).should(selected ? 'be.visible' : 'not.exist');
});

Cypress.Commands.add('checkMappingLineSelected', (selected: boolean) => {
  cy.get('[data-testid^="mapping-link-selected"]').should(selected ? 'be.visible' : 'not.exist');
});

Cypress.Commands.add('countMappingLines', (num: number) => {
  cy.get('[data-testid^="mapping-link-"]').should('have.length', num);
});

Cypress.Commands.add('getDataMapperNode', (nodePath: string[]) => {
  return nodePath.slice(1).reduce(
    (acc, nodeId) => {
      return acc.find(`[data-testid^="${nodeId}"]`);
    },
    cy.get(`[data-testid^="${nodePath[0]}"]`),
  );
});

Cypress.Commands.add('engageMapping', (sourceNodePath: string[], targetNodePath: string[], testXPath: string) => {
  const dataTransfer = new DataTransfer();

  const sourceNode = cy.getDataMapperNode(sourceNodePath);
  const targetNode = cy.getDataMapperNode(targetNodePath);

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

  cy.getDataMapperNode(targetNodePath)
    .find('[data-testid="transformation-xpath-input"]')
    .should('have.value', testXPath);
});

Cypress.Commands.add(
  'engageForEachMapping',
  (sourceNodePath: string[], targetNodePath: string[], testXPath: string) => {
    const targetNode = cy.getDataMapperNode(targetNodePath);
    targetNode.find('[data-testid="transformation-actions-menu-toggle"]').first().click();
    cy.get('[data-testid="transformation-actions-foreach"]').click();

    const updatedTargetNodePath = [...targetNodePath.slice(0, targetNodePath.length - 1), 'node-target-for-each'];
    cy.engageMapping(sourceNodePath, updatedTargetNodePath, testXPath);
  },
);
