describe('Test for root rest container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root rest configuration', () => {
    cy.openRestEditor();

    cy.get('[data-testid="rest-tree-toolbar-menu"]').find('button').click();
    cy.get('[data-testid="add-rest-service-btn"]').click();

    cy.interactWithConfigInputObject('description', 'description Label');
    cy.interactWithConfigInputObject('path', 'testPath');
    cy.selectMediaTypes('consumes', ['application/json', 'application/xml']);
    cy.selectMediaTypes('produces', ['application/json', 'application/xml']);
    cy.selectInTypeaheadField('bindingMode', 'json');

    // Insert Rest operation (method)
    cy.get('[data-testid="rest-tree-toolbar-menu"]').find('button').click();
    cy.get('[data-testid="add-rest-operation-btn"]').click();

    cy.get('[data-testid="#.method-typeahead-select-input"]').find('input').clear().type('get');
    cy.get('[data-testid="add-method-modal"]').within(() => {
      cy.interactWithConfigInputObject('path', 'testPath');
      cy.interactWithConfigInputObject('id', 'testId');
    });
    cy.get('[data-testid="add-method-modal-add-btn"]').click();

    cy.openSourceCode();

    cy.checkCodeSpanLine('- rest:');
    cy.checkCodeSpanLine('description: description Label');
    cy.checkCodeSpanLine('path: testPath');
    cy.checkCodeSpanLine('consumes: application/json, application/xml');
    cy.checkCodeSpanLine('produces: application/json, application/xml');
    cy.checkCodeSpanLine('bindingMode: json');
    cy.checkCodeSpanLine('get:');
  });
});
