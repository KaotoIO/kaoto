describe('Tests for basic XML operations', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Design - add steps to XML camel route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.switchCodeToXml();

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'as2');
    cy.checkNodeExist('as2', 1);

    cy.openStepConfigurationTab('as2');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('id', 'id-1234');

    cy.openSourceCode();
    const xmlRoute = [
      '<from uri="timer:test"/>',
      '<setHeader name="test">',
      '<constant>',
      'test',
      '</constant>',
      '</setHeader>',
      '<to id="id-1234" uri="as2:/"/>',
      '<marshal id="marshal-3801"/>',
      '<to uri="log:test"/>',
    ];
    cy.checkMultiLineContent(xmlRoute);
  });

  it('Design - remove steps from XML camel route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.switchCodeToXml();

    cy.removeNodeByName('setHeader');

    cy.openSourceCode();

    const xmlRoute = ['<from uri="timer:test"/>', '<marshal id="marshal-3801"/>', '<to uri="log:test"/>'];
    cy.checkMultiLineContent(xmlRoute);
  });

  it('Design - expression configuration in XML camel route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.switchCodeToXml();
    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.selectExpression('Simple');
    cy.interactWithExpressionInputObject('simple.expression', `{{}{{}header.baz}}`);
    cy.interactWithExpressionInputObject('simple.id', 'simpleExpressionId');
    cy.interactWithExpressionInputObject('simple.resultType', 'java.lang.String');

    const xmlRoute = [
      '<from uri="timer:test"/>',
      '<setHeader name="test">',
      '<simple id="simpleExpressionId" resultType="java.lang.String">',
      '{{header.baz}}',
      '</simple>',
      '</setHeader>',
      '<marshal id="marshal-3801"/>',
      '<to uri="log:test"/>',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(xmlRoute);
  });

  it('Design - dataformat configuration in XML camel route', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.switchCodeToXml();

    cy.openStepConfigurationTab('marshal');
    cy.selectFormTab('All');
    cy.selectDataformat('Base64');
    cy.expandWrappedSection('#.base64-Advanced');
    cy.interactWithConfigInputObject('base64.lineLength', '128');
    cy.interactWithConfigInputObject('base64.id', 'simpleDataformatId');
    cy.interactWithConfigInputObject('base64.lineSeparator', 'simpleLineSeparator');
    cy.interactWithConfigInputObject('base64.urlSafe');

    const xmlRoute = [
      '<from uri="timer:test"/>',
      '<setHeader name="test">',
      '<constant>',
      'test',
      '</constant>',
      '</setHeader>',
      '<marshal id="marshal-3801">',
      '<base64 id="simpleDataformatId" lineLength="128" lineSeparator="simpleLineSeparator" urlSafe="true"/>',
      '</marshal>',
      '<to uri="log:test"/>',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(xmlRoute);
  });
});
