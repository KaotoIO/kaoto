describe('Test for Multi route for XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User imports Yaml multi route and transforms to XML', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.switchCodeToXml();

    const xml = [
      '<route id="route-1234">',
      '<from id="from-3362" uri="timer:template?period=1000"/>',
      '<log id="log-6809" message="${body}"/>',
      '</route>',
      '<route id="route-4321">',
      '<from id="from-3576" uri="timer:template?period=1000"/>',
      '<log id="log-2966" message="${body}"/>',
      '</route>',
    ];

    cy.openSourceCode();

    cy.checkMultiLineContent(xml);
  });
});
