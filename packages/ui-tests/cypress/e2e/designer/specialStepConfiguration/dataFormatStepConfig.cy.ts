describe('Tests for sidebar dataformat configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - sidebar dataformat configuration', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    // Configure marshal dataformat
    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.selectDataformat('Base64');
    cy.interactWithDataformatInputObject('lineLength', '128');
    cy.interactWithDataformatInputObject('id', 'simpleDataformatId');
    cy.interactWithDataformatInputObject('lineSeparator', 'simpleLineSeparator');
    cy.interactWithDataformatInputObject('urlSafe');

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('lineLength: "128"', 1);
    cy.checkCodeSpanLine('id: simpleDataformatId', 1);
    cy.checkCodeSpanLine('lineSeparator: simpleLineSeparator', 1);
    cy.checkCodeSpanLine('urlSafe: true', 1);
  });

  it('Design - sidebar dataformat configuration in Kamelet', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    // Configure marshal dataformat
    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.selectDataformat('Avro');
    cy.configureDropdownValue('library', 'avroJackson');
    cy.interactWithDataformatInputObject('unmarshalType', 'com.fasterxml.jackson.databind.JsonNode');
    cy.interactWithDataformatInputObject('schemaResolver', '#bean:{{}{{}schemaResolver}}');
    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('library: avroJackson', 1);
    cy.checkCodeSpanLine('unmarshalType: com.fasterxml.jackson.databind.JsonNode', 1);
    cy.checkCodeSpanLine('schemaResolver: "#bean:{{schemaResolver}}"', 1);

    // Blocked by https://github.com/KaotoIO/kaoto/issues/489
    // cy.checkCodeSpanLine('camel:jackson-avro', 1);
  });
});
