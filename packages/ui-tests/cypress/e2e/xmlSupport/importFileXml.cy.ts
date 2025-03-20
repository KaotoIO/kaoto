describe('Tests for import of XML route', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User imports the XML camel route, transforms into Yaml format', () => {
    cy.uploadFixture('flows/camelRoute/basic.xml');
    cy.openDesignPage();

    cy.switchCodeToYaml();

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- setHeader:',
      'name: test',
      '- marshal:',
      'id: marshal-1234',
      '- to:',
      'uri: log:test',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
  });
});
