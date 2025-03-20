describe('Tests for edit of XML document in code editor', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User edits the imported XML camel route in source code editor, transforms to Yaml', () => {
    cy.uploadFixture('flows/camelRoute/basic.xml');
    const stepToInsert = `    <to description="insert-field-XML" uri="log:InfoLogger?level=DEBUG"/>`;
    cy.editorAddText(5, stepToInsert);
    cy.openDesignPage();

    cy.checkNodeExist('insert-field-XML', 1);
    cy.switchCodeToYaml();

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- setHeader:',
      'name: test',
      '- to:',
      'description: insert-field-XML',
      'uri: log:InfoLogger?level=DEBUG',
      '- marshal:',
      'id: marshal-1234',
      '- to:',
      'uri: log:test',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
  });
});
