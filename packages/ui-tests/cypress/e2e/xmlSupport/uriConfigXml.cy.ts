describe('Test for URI config for XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User loads the Yaml URI config route, transforms to XML', () => {
    cy.uploadFixture('flows/camelRoute/uriConf.yaml');
    cy.openDesignPage();
    cy.switchCodeToXml();

    const xml = [
      '<from uri="timer:start?period=1000&amp;delay=2000&amp;repeatCount=10"/>',
      '<setBody>',
      '<constant>Initial message</constant>',
      '</setBody>',
      '<to uri="log:info?showAll=true&amp;multiline=true&amp;logMask=true"/>',
      '<transform>',
      '<simple>${body.toUpperCase()}</simple>',
      '</transform>',
      '<to uri="file:output?fileName=output.txt&amp;fileExist=Append"/>',
    ];

    cy.openSourceCode();

    cy.checkMultiLineContent(xml);
  });
});
