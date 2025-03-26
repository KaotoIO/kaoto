describe('Test of camel route with branches for XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User imports complex Yaml camel route and transforms to XML', () => {
    cy.uploadFixture('flows/camelRoute/complex.yaml');
    cy.openDesignPage();
    cy.switchCodeToXml();

    const xml = [
      '<from uri="timer:template?period=1000"/>',
      '<choice>',
      '<when>',
      '<simple>',
      '${header.foo} == 1',
      '</simple>',
      '<setHeader name="setHeader">',
      '<simple>',
      'foo',
      '</simple>',
      '</setHeader>',
      '</when>',
      '<when>',
      '<simple>',
      '${header.foo} == 1',
      '</simple>',
      '<log message="${body}"/>',
      '</when>',
      '<otherwise>',
      '<marshal/>',
      '</otherwise>',
      '</choice>',
      '<log message="${body}"/>',
    ];

    cy.openSourceCode();

    cy.checkMultiLineContent(xml);
  });
});
