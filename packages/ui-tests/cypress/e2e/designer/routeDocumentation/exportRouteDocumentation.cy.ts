describe('Test documentation generation functionality', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Check the documentation was generated for simple camel route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.generateDocumentationPreview();

    const expectedCamelRouteTableData = [
      ['', 'from', 'timer:test', '', ''],
      ['', 'setHeader', '', 'constant', 'test'],
      ['', '', '', 'name', 'test'],
      ['marshal-3801', 'marshal', '', '', ''],
      ['', 'to', 'log:test', '', ''],
    ];
    cy.documentationTableCompare('camel-route', expectedCamelRouteTableData);
  });

  it('Check the documentation was generated for simple kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.generateDocumentationPreview();

    const expectedStepsTableData = [
      ['from-1870', 'from', 'timer:user', 'period', '{{period}}'],
      ['setBody-3387', 'setBody', '', 'expression (simple)', ''],
      ['marshal-1414', 'marshal', '', '', ''],
      ['', 'to', 'kamelet:sink', '', ''],
    ];

    const expectedDefinitionTableData = [
      ['(root)', 'title', 'kamelet-2082'],
      ['', 'type', 'object'],
      ['period', 'title', 'Period'],
      ['', 'description', 'The time interval between two events'],
      ['', 'type', 'integer'],
      ['', 'default', '5000'],
    ];

    const expectedTypesTableData = [['out', 'application/json']];

    const expectedDependenciesTableData = [['camel:timer'], ['camel:http'], ['camel:kamelet']];

    const expectedMetadataTableData = [['name', 'eip-action']];

    cy.documentationTableCompare('Steps', expectedStepsTableData);
    cy.documentationTableCompare('Definition', expectedDefinitionTableData);
    cy.documentationTableCompare('Types', expectedTypesTableData);
    cy.documentationTableCompare('Dependencies', expectedDependenciesTableData);
    cy.documentationTableCompare('Metadata', expectedMetadataTableData);
  });

  it('Check the documentation was generated for simple pipe', () => {
    cy.uploadFixture('flows/pipe/basic.yaml');
    cy.openDesignPage();

    cy.generateDocumentationPreview();

    const expectedStepsTableData = [
      ['source', 'REF Kind', '', 'Kamelet'],
      ['', 'REF API Version', '', 'camel.apache.org/v1'],
      ['', 'REF Name', '', 'timer-source'],
      ['', '', 'message', 'hello'],
      ['sink', 'REF Kind', '', 'Kamelet'],
      ['', 'REF API Version', '', 'camel.apache.org/v1'],
      ['', 'REF Name', '', 'log-sink'],
    ];

    const expectedMetadataTableData = [['name', 'pipe']];

    cy.documentationTableCompare('Steps', expectedStepsTableData);
    cy.documentationTableCompare('Metadata', expectedMetadataTableData);
  });

  it('Check the documentation was generated for multiple camel routes', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(1);
    cy.generateDocumentationPreview();

    const expectedRoute1234TableData = [
      ['from-3362', 'from', 'timer:template', 'period', '1000'],
      ['log-6809', 'log', '', 'message', '${body}'],
    ];

    const expectedRoute4321TableData = [
      ['from-3576', 'from', 'timer:template', 'period', '1000'],
      ['log-2966', 'log', '', 'message', '${body}'],
    ];

    cy.documentationTableCompare('route-1234', expectedRoute1234TableData);
    cy.documentationTableCompare('route-4321', expectedRoute4321TableData);
  });

  it('Check the documentation was generated for simple camel route with field additon', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.generateDocumentationPreview();

    const expectedCamelRouteTableData = [
      ['', 'from', 'timer:test', '', ''],
      ['', 'setHeader', '', 'constant', 'test'],
      ['', '', '', 'name', 'test'],
      ['marshal-3801', 'marshal', '', '', ''],
      ['', 'to', 'log:test', '', ''],
    ];
    cy.documentationTableCompare('camel-route', expectedCamelRouteTableData);
    cy.get('.pf-v6-c-modal-box__close').click();

    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('variableSend', 'test');
    cy.closeStepConfigurationTab();

    cy.generateDocumentationPreview();

    const expectedResultTableData = [
      ['', 'from', 'timer:test', '', ''],
      ['', 'setHeader', '', 'constant', 'test'],
      ['', '', '', 'name', 'test'],
      ['marshal-3801', 'marshal', '', 'variableSend', 'test'],
      ['', 'to', 'log:test', '', ''],
    ];
    cy.documentationTableCompare('camel-route', expectedResultTableData);
  });

  // reproducer for https://github.com/KaotoIO/kaoto/issues/2093
  it('Check the documentation was generated for simple camel route with field additon', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');

    cy.openBeans();
    cy.get('[data-testid="metadata-add-Beans-btn"]').eq(0).click();
    cy.get(`input[name="#.name"]`).clear().type('test');
    cy.get(`input[name="#.type"]`).clear().type('org.acme');
    cy.get(`input[name="#.initMethod"]`).clear().type('initMethodTest');
    cy.get(`input[name="#.destroyMethod"]`).clear().type('destroyMethodTest');
    cy.get(`input[name="#.factoryMethod"]`).clear().type('factoryMethodTest');
    cy.get(`input[name="#.factoryBean"]`).clear().type('factoryBeanTest');
    cy.get(`input[name="#.builderClass"]`).clear().type('builderClassTest');

    cy.get('button[aria-label="Toggle Advanced group"]').click();
    cy.get(`input[name="#.scriptLanguage"]`).clear().type('scriptLanguageTest');
    cy.get(`textarea[name="#.script"]`).clear().type('scriptTest');

    cy.openDesignPage();

    cy.generateDocumentationPreview();

    const expectedCamelRouteTableData = [
      ['', 'from', 'timer:test', '', ''],
      ['', 'setHeader', '', 'constant', 'test'],
      ['', '', '', 'name', 'test'],
      ['marshal-3801', 'marshal', '', '', ''],
      ['', 'to', 'log:test', '', ''],
    ];

    const expectedBeansTableData = [
      ['test', 'org.acme', '', 'initMethod', 'initMethodTest'],
      ['', '', '', 'destroyMethod', 'destroyMethodTest'],
      ['', '', '', 'factoryMethod', 'factoryMethodTest'],
      ['', '', '', 'factoryBean', 'factoryBeanTest'],
      ['', '', '', 'builderClass', 'builderClassTest'],
      ['', '', '', 'scriptLanguage', 'scriptLanguageTest'],
      ['', '', '', 'script', 'scriptTest'],
    ];
    cy.documentationTableCompare('camel-route', expectedCamelRouteTableData);
    cy.documentationTableCompare('Beans', expectedBeansTableData);
  });
});
