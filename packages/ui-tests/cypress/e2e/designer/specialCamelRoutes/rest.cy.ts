describe('Test for root rest container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root rest configuration', () => {
    cy.selectCamelRouteType('Rest', 'rest');

    // Open rest configuration tab, using the first rest node
    cy.get(`g[data-grouplabel^="rest-"]`).eq(0).click({ force: true });

    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('description', 'description Label');
    cy.interactWithConfigInputObject('path', 'testPath');
    cy.selectMediaTypes('consumes', ['application/json', 'application/xml']);
    cy.selectMediaTypes('produces', ['application/json', 'application/xml']);
    cy.selectInTypeaheadField('bindingMode', 'json');

    // Insert special node intercept to Route Configuration
    cy.selectInsertSpecialNode('description Label');
    cy.chooseFromCatalog('processor', 'get');

    cy.openSourceCode();

    cy.checkCodeSpanLine('- rest:');
    cy.checkCodeSpanLine('description: description Label');
    cy.checkCodeSpanLine('path: testPath');
    cy.checkCodeSpanLine('consumes: application/json, application/xml');
    cy.checkCodeSpanLine('produces: application/json, application/xml');
    cy.checkCodeSpanLine('bindingMode: json');
    cy.checkCodeSpanLine('get:');
  });

  it('Move rest methods', () => {
    cy.uploadFixture('flows/camelRoute/restDsl.yaml');
    cy.openDesignPage();

    cy.selectMoveAfterNode('get', 0);
    cy.selectMoveBeforeNode('get', 1);

    cy.openSourceCode();
    const rest = [
      '- id: get-1871',
      'to:',
      'id: to-3216',
      'uri: direct',
      'parameters:',
      'name: operation-get-right',
      '- id: get-3806',
      'to:',
      'id: to-3916',
      'uri: direct',
      'parameters:',
      'name: operation-get-left',
    ];

    cy.openSourceCode();

    cy.checkMultiLineContent(rest);
  });
});
