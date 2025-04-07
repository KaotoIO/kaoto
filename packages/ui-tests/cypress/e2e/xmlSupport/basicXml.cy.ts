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

  // reproducer for https://github.com/KaotoIO/kaoto/issues/2121
  it('When working with XML, fields cannot be cleared', () => {
    cy.uploadFixture('flows/camelRoute/namespaced.xml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');
    cy.selectFormTab('All');

    cy.get('[data-testid="#.parameters.timerName__field-actions"]').click();
    cy.get('[data-testid="#.parameters.timerName__clear"]').click();

    cy.openSourceCode();
    cy.checkCodeSpanLine('<from uri="timer:hola?period=1000"/>', 0);
    cy.checkCodeSpanLine('<from uri="timer?period=1000"/>', 1);
  });

  // reproducer for https://github.com/KaotoIO/kaoto/issues/2087
  it('XML namespace with xsd association are removed when files are modified', () => {
    cy.uploadFixture('flows/camelRoute/namespaced.xml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('timer');
    cy.selectFormTab('All');

    cy.interactWithConfigInputObject('parameters.timerName', 'testTimerName');

    cy.openSourceCode();
    cy.checkCodeSpanLine('<?xml version="1.0" encoding="UTF-8"?>', 1);
    cy.checkCodeSpanLine(
      '<camel xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://camel.apache.org/schema/spring https://camel.apache.org/schema/spring/camel-spring.xsd">',
      1,
    );
  });
});
