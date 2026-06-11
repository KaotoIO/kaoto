describe('Test for URI config for XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User loads the XML URI config route, updates the from URI', () => {
    cy.uploadFixture('flows/camelRoute/uriConf.xml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('parameters.period', '5000');
    cy.interactWithConfigInputObject('parameters.delay', '999');
    cy.interactWithConfigInputObject('parameters.repeatCount', '5');

    const xml = [
      '<from uri="timer:start?period=5000&amp;delay=999&amp;repeatCount=5"/>',
      '<setBody>',
      '<constant>',
      'Initial message',
      '</constant>',
      '</setBody>',
      '<to uri="log:info?showAll=true&amp;multiline=true&amp;logMask=true"/>',
      '<transform id="transform-2546">',
      '<simple>',
      '${body.uppercase()}',
      '</simple>',
      '</transform>',
      '<to uri="file:output?fileName=output.txt&amp;fileExist=Append"/>',
    ];

    cy.openSourceCode();

    cy.checkMultiLineContent(xml);
  });
});
