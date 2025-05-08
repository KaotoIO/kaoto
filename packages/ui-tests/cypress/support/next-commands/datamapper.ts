Cypress.Commands.add('attachSourceBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-sourceBody-Body-button"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
});

Cypress.Commands.add('attachTargetBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-targetBody-Body-button"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
});

Cypress.Commands.add('addParameter', (name: string) => {
  cy.get('[data-testid="add-parameter-button"]').click();
  cy.get('[data-testid="add-new-parameter-name-input"]').type(name);
  cy.get('[data-testid="add-new-parameter-submit-btn"]').click();
});

Cypress.Commands.add('attachParameterSchema', (name: string, filePath: string) => {
  cy.get(`[data-testid="attach-schema-param-${name}-button"]`).click();
  cy.get('[data-testid="attach-schema-file-input"]').attachFile(filePath);
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

Cypress.Commands.add('checkFieldSelected', (type: string, fieldName: string, selected: boolean) => {
  cy.get(`[data-testid^="node-${type}-field-${fieldName}`).should(selected ? 'not.exist' : 'be.visible');
  cy.get(`[data-testid^="node-${type}-selected-field-${fieldName}`).should(selected ? 'be.visible' : 'not.exist');
});

Cypress.Commands.add('checkMappingLineSelected', (selected: boolean) => {
  cy.get('[data-testid^="mapping-link-selected"]').should(selected ? 'be.visible' : 'not.exist');
});
