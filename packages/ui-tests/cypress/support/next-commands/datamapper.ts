Cypress.Commands.add('attachSourceBodySchema', (filePath: string) => {
  cy.get('[data-testid="attach-schema-sourceBody-Body-button"]').click();
  if (filePath.endsWith('json')) {
    cy.get('[data-testid="attach-schema-modal-option-json"]').click();
  }
  cy.get('[data-testid="attach-schema-modal-btn-file"]').click();
  cy.get('[data-testid="attach-schema-file-input"]').selectFile(filePath, { force: true });
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
  cy.get('[data-testid="attach-schema-file-input"]').selectFile(filePaths, { force: true });
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
  cy.get('[data-testid="attach-schema-file-input"]').selectFile(filePath, { force: true });

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
  cy.get('[data-testid="dm-debug-import-mappings-file-input"]').selectFile(filePath, { force: true });
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
    cy.get('[data-testid="transformation-actions-group-Wrap with Instruction"]').find('button').first().click();
    cy.get('[data-testid="transformation-actions-foreach"]').click();

    const updatedTargetNodePath = [...targetNodePath.slice(0, -1), 'node-target-for-each'];
    cy.engageMapping(sourceNodePath, updatedTargetNodePath, testXPath);
  },
);

/**
 * Opens the XPath Editor modal for the given target node.
 * Clicks the edit-xpath-button on the target field and waits for the modal and Monaco editor to appear.
 */
Cypress.Commands.add('openXPathEditor', (targetNodePath: string[]) => {
  cy.getDataMapperTargetNode(targetNodePath).find('[data-testid^="edit-xpath-button-"]').first().click({ force: true });
  cy.get('[data-testid="xpath-editor-modal"]').should('be.visible');
  cy.get('[data-testid="xpath-editor"]').should('be.visible');
});

/**
 * Sets text in the Monaco-based XPath editor inside the XPath Editor modal,
 * replacing any existing content.
 * The editor must already be open before calling this command.
 */
Cypress.Commands.add('typeInXPathEditor', (text: string) => {
  cy.get('[data-testid="xpath-editor"]').should('be.visible');
  // Clear the Monaco model via the API before typing.  Using the API is more
  // reliable than {selectAll}{del} on the hidden textarea, which does not work
  // consistently in Firefox because the synthesised selection is not established
  // before the delete keystroke fires.
  cy.window().then((win) => {
    const container = Cypress.$('[data-testid="xpath-editor"]')[0];
    const xpathEditor = win.monaco.editor.getEditors().find((e) => container.contains(e.getDomNode()!));
    xpathEditor?.getModel()?.setValue('');
  });

  if (text) {
    // Locate Monaco's hidden textarea — the real keyboard input sink.
    // force: true is required because the textarea is visually hidden.
    const textarea = '[data-testid="xpath-editor"] .monaco-editor textarea';
    // Split on newlines so we can type each line with special-sequence parsing
    // disabled (preventing Cypress from misinterpreting literal `{` / `}` in
    // XPath), while still sending a real Enter keystroke between lines.
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      cy.get(textarea).type(line, { force: true, parseSpecialCharSequences: false });
      if (index < lines.length - 1) {
        cy.get(textarea).type('{enter}', { force: true });
      }
    });
  }
  // Confirm the model value was stored correctly by reading it back — avoids
  // false failures caused by Monaco's tokenised DOM rendering (invisible spans,
  // non-breaking spaces, etc.) that make contain.text unreliable.
  cy.window().should((win) => {
    const container = Cypress.$('[data-testid="xpath-editor"]')[0];
    const xpathEditor = win.monaco.editor.getEditors().find((e) => container.contains(e.getDomNode()!));
    const value = xpathEditor?.getModel()?.getValue();
    expect(value).to.equal(text);
  });
});

/**
 * Drags an element (identified by `draggableSelector`) into the XPath Editor
 * drop zone and releases it.
 *
 * The XPath Editor modal must already be open.
 */
Cypress.Commands.add('dragToXPathEditor', (draggableSelector: string) => {
  const dataTransfer = new DataTransfer();

  // Scope all queries to the modal to avoid matching duplicate nodes outside it.
  const modal = () => cy.get('[data-testid="xpath-editor-modal"]');

  // Initiate the drag on the source element
  modal()
    .find(draggableSelector)
    .first()
    .trigger('mouseenter', { dataTransfer })
    .trigger('mouseover', { dataTransfer })
    .trigger('mousedown', { dataTransfer });

  // Move toward the drop zone so the DnD layer activates
  modal().find('[id^="droppable-xpath-editor"]').trigger('mousemove', { dataTransfer });

  // Verify the draggable side became active
  modal().find(draggableSelector).first().should('have.attr', 'data-dnd-draggable');

  // Hover over the drop zone to activate the droppable side
  modal()
    .find('[id^="droppable-xpath-editor"]')
    .trigger('mouseenter', { dataTransfer })
    .trigger('mouseover', { dataTransfer })
    .trigger('mousemove', { dataTransfer });

  // Verify the drop zone became active
  modal().find('[id^="droppable-xpath-editor"]').should('have.attr', 'data-dnd-droppable');

  // Release — complete the drop
  modal().find('[id^="droppable-xpath-editor"]').trigger('mouseup', { dataTransfer, force: true });

  // Wait for the drop handler to settle before returning. The DnD handler updates
  // the Monaco model asynchronously; asserting the editor is still visible ensures
  // React has flushed the state update and the modal is stable before the caller
  // attempts to close it.
  modal().find('[data-testid="xpath-editor"]').should('be.visible');
});

/**
 * Retries until the Monaco model inside the open XPath Editor contains the
 * expected substring. Use this after `dragToXPathEditor` to wait for the
 * asynchronous DnD handler to finish writing the dropped value into the model
 * before closing the editor.
 */
Cypress.Commands.add('verifyXPathEditorModelIncludes', (expected: string) => {
  cy.window().should((win) => {
    const container = Cypress.$('[data-testid="xpath-editor"]')[0];
    const xpathEditor = win.monaco.editor.getEditors().find((e) => container.contains(e.getDomNode()!));
    const value = xpathEditor?.getModel()?.getValue() ?? '';
    expect(value).to.include(expected);
  });
});

/**
 * Asserts that the inline transformation-xpath-input for the given target node
 * has exactly the expected value. Call this before or after closing the editor.
 */
Cypress.Commands.add('verifyXPathEditorOutput', (targetNodePath: string[], expectedValue: string) => {
  cy.getDataMapperTargetNode(targetNodePath)
    .find('[data-testid="transformation-xpath-input"]')
    .should('have.value', expectedValue);
});

/**
 * Closes the XPath Editor modal and waits for it to disappear.
 * Use `verifyXPathEditorOutput` separately to assert the resulting expression.
 */
Cypress.Commands.add('closeXPathEditor', () => {
  cy.get('[data-testid="close-xpath-editor-btn"]').click();
  cy.get('[data-testid="xpath-editor-modal"]').should('not.exist');
});

/**
 * Switches the XPath Editor sidebar to the Function tab and waits for
 * both the search input and the String function group to be visible —
 * the minimum readiness signal before interacting with the function list.
 * The editor modal must already be open before calling this command.
 */
Cypress.Commands.add('openXPathFunctionTab', () => {
  cy.get('[data-testid="xpath-editor-tab-function"]').click();
  cy.get('[data-testid="functions-menu-search-input"]').should('be.visible');
  cy.get('[data-testid="function-group-toggle-String"]').should('be.visible');
});
