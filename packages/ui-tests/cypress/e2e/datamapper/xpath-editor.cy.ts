// Coverage: DataMapper XPath Editor — open/close, manual typing, DnD field, DnD function, operators, whitespace

describe('Test for DataMapper : XPath Editor', () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.openDataMapper();
    // Use ShipOrder → ShipOrder as a symmetric source/target so all fields are available
    cy.attachSourceBodySchema('cypress/fixtures/datamapper/xsd/ShipOrder.xsd');
    cy.attachTargetBodySchema('cypress/fixtures/datamapper/xsd/ShipOrder.xsd');
    // Import an existing XSLT mapping so fields already have XPath expressions to edit
    cy.importMappings('cypress/fixtures/datamapper/xslt/ShipOrderToShipOrder.xsl');
  });

  it('open XPath Editor via fx button and close it → modal opens and closes correctly', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);

    // Verify all major editor UI elements are present
    cy.get('[data-testid="xpath-editor-modal"]').should('be.visible');
    cy.get('[data-testid="xpath-editor"]').should('be.visible');
    cy.get('[data-testid="xpath-editor-tab-field"]').should('be.visible');
    cy.get('[data-testid="xpath-editor-tab-function"]').should('be.visible');
    cy.get('[data-testid="close-xpath-editor-btn"]').should('be.visible');
    cy.get('[data-testid="xpath-editor-hint"]').should('be.visible');

    cy.closeXPathEditor();
  });

  it('type a field path manually → inline XPath input reflects the expression', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);
    cy.typeInXPathEditor('/ns0:ShipOrder/ns0:OrderPerson');
    cy.closeXPathEditor();
    // Verify the inline input reflects the edited expression
    cy.verifyXPathEditorOutput(
      ['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'],
      '/ns0:ShipOrder/ns0:OrderPerson',
    );
    // Verify the generated XSLT contains the edited expression
    cy.exportMappings();
    cy.getMonacoValue().then(({ sourceCode }) => {
      expect(sourceCode).to.include('/ns0:ShipOrder/ns0:OrderPerson');
    });
    cy.closeExportMappingsModal();
  });

  it('type a function call manually → inline XPath input reflects the expression', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);
    cy.typeInXPathEditor('string-length(/ns0:ShipOrder/ns0:OrderPerson)');
    cy.closeXPathEditor();
    // Verify the inline input reflects the edited expression
    cy.verifyXPathEditorOutput(
      ['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'],
      'string-length(/ns0:ShipOrder/ns0:OrderPerson)',
    );
    // Verify the generated XSLT contains the edited expression
    cy.exportMappings();
    cy.getMonacoValue().then(({ sourceCode }) => {
      expect(sourceCode).to.include('string-length(/ns0:ShipOrder/ns0:OrderPerson)');
    });
    cy.closeExportMappingsModal();
  });

  it('type arithmetic operators (+, -, *, /) → inline XPath input reflects the expression', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);
    cy.typeInXPathEditor('1 + 2 - 1 * 3 / 2');
    cy.closeXPathEditor();
    cy.verifyXPathEditorOutput(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'], '1 + 2 - 1 * 3 / 2');
  });

  it('type space and Enter (newline) → expression is preserved after close', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);
    // Monaco keeps the raw multi-line value; the inline input will contain the full string.
    cy.typeInXPathEditor('/ns0:ShipOrder/\nns0:OrderPerson');
    cy.closeXPathEditor();
    // Value is multi-line so check parts separately
    cy.getDataMapperTargetNode(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'])
      .find('[data-testid="transformation-xpath-input"]')
      .invoke('val')
      .should('include', '/ns0:ShipOrder/')
      .and('include', 'ns0:OrderPerson');
  });

  it(
    'DnD a field from Field tab into editor → inline XPath input reflects the dropped field path',
    { browser: '!firefox' },
    () => {
      cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);

      // The Field tab is active by default — the SourcePanel is rendered inside it
      cy.get('[data-testid="xpath-editor-tab-field"]').should('have.attr', 'aria-selected', 'true');

      // Clear the existing expression so the drop is the sole contributor
      cy.typeInXPathEditor('');

      // Drag the OrderPerson source field from the read-only SourcePanel into the editor drop zone
      cy.get('.xpath-editor .source-panel')
        .find('[data-testid^="node-source-fx-OrderPerson"]')
        .find('[id^="draggable-"]')
        .first()
        .invoke('attr', 'id')
        .then((id) => cy.dragToXPathEditor(`[id="${id}"]`));

      // Wait for the model to contain the dropped path before closing
      cy.verifyXPathEditorModelIncludes('OrderPerson');

      cy.closeXPathEditor();
      // The dropped OrderPerson field resolves to an absolute path with the ns0 prefix
      // that was already registered by the imported XSLT
      cy.getDataMapperTargetNode(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'])
        .find('[data-testid="transformation-xpath-input"]')
        .invoke('val')
        .should('include', 'OrderPerson');
    },
  );

  it(
    'DnD a function from Function tab into editor → inline XPath input wraps expression with function',
    { browser: '!firefox' },
    () => {
      cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);

      // Switch to Function tab — the String group is expanded by default
      cy.openXPathFunctionTab();

      // Draggable ID pattern: draggable-${FunctionGroup}-${func.name} → draggable-String-concat
      cy.dragToXPathEditor('[id="draggable-String-concat"]');

      // Wait for the model to contain the dropped function before closing
      cy.verifyXPathEditorModelIncludes('concat(');

      cy.closeXPathEditor();
      // Verify the expression now contains the function wrapper
      cy.getDataMapperTargetNode(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson'])
        .find('[data-testid="transformation-xpath-input"]')
        .invoke('val')
        .should('include', 'concat(');
    },
  );

  it('type in Function tab search filter → list is filtered to matching functions', () => {
    cy.openXPathEditor(['document-doc-targetBody-Body', 'node-target-fx-OrderPerson']);

    cy.openXPathFunctionTab();

    // Type in the search to narrow down to string-length
    cy.get('[data-testid="functions-menu-search-input"]').find('input').type('String Length');

    // Only string-length related items should be visible; verify by text presence
    cy.contains('String Length').should('be.visible');
    // Other unrelated functions should not be rendered
    cy.contains('Concatenate').should('not.exist');

    cy.closeXPathEditor();
  });
});
