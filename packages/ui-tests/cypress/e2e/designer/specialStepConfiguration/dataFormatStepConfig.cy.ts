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
    cy.expandWrappedSection('#.base64-Advanced');
    cy.interactWithDataformatInputObject('base64.lineLength', '128');
    cy.interactWithDataformatInputObject('base64.id', 'simpleDataformatId');
    cy.interactWithDataformatInputObject('base64.lineSeparator', 'simpleLineSeparator');
    cy.interactWithDataformatInputObject('base64.urlSafe');

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
    cy.expandWrappedSection('#.avro-Advanced');
    cy.configureDropdownValue('avro.library', 'Jackson');
    cy.interactWithDataformatInputObject('avro.unmarshalType', 'com.fasterxml.jackson.databind.JsonNode');
    cy.configureNewBeanReference('avro.schemaResolver');
    cy.get(`input[name="#.name"]`).clear().type('schemaResolver');
    cy.get(`input[name="#.type"]`).clear().type('org.acme');
    cy.get('[data-testid="create-bean-btn"').click();

    // CHECK they are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('library: Jackson', 1);
    cy.checkCodeSpanLine('unmarshalType: com.fasterxml.jackson.databind.JsonNode', 1);
    cy.checkCodeSpanLine('schemaResolver: "#bean:{{schemaResolver}}"', 1);

    // Blocked by https://github.com/KaotoIO/kaoto/issues/489
    // cy.checkCodeSpanLine('camel:jackson-avro', 1);
  });
});
