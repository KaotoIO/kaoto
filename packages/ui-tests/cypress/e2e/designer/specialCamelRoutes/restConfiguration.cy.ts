describe('Test for root on rest configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root rest configuration', () => {
    cy.selectCamelRouteType('Rest', 'restConfiguration');

    cy.get('[data-id^="restConfiguration"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();
    cy.selectFormTab('All');

    cy.selectInTypeaheadField('component', 'coap');
    cy.selectInTypeaheadField('apiComponent', 'openapi');
    cy.selectInTypeaheadField('producerComponent', 'http');
    cy.interactWithConfigInputObject('scheme', 'testScheme');
    cy.interactWithConfigInputObject('host', 'testHost');
    cy.interactWithConfigInputObject('port', '8080');
    cy.interactWithConfigInputObject('apiHost', 'testApiHost');
    cy.interactWithConfigInputObject('useXForwardHeaders');
    cy.interactWithConfigInputObject('producerApiDoc', 'testProducerApiDoc');
    cy.interactWithConfigInputObject('contextPath', 'testContextPath');
    cy.interactWithConfigInputObject('apiContextPath', 'testApiContextPath');
    cy.interactWithConfigInputObject('apiContextRouteId', 'testApiContextRouteId');
    cy.interactWithConfigInputObject('apiVendorExtension');
    cy.selectInTypeaheadField('hostNameResolver', 'localIp');
    cy.selectInTypeaheadField('bindingMode', 'auto');
    cy.interactWithConfigInputObject('skipBindingOnErrorCode');
    cy.interactWithConfigInputObject('clientRequestValidation');
    cy.interactWithConfigInputObject('enableCORS');
    cy.interactWithConfigInputObject('enableNoContentResponse');
    cy.interactWithConfigInputObject('inlineRoutes');
    cy.interactWithConfigInputObject('jsonDataFormat', 'testJsonDataFormat');
    cy.interactWithConfigInputObject('xmlDataFormat', 'testXmlDataFormat');

    cy.addSingleKVProperty('Component Property', 'componentTestKey', 'componentTestValue');
    cy.addSingleKVProperty('Endpoint Property', 'endpointTestKey', 'endpointTestValue');
    cy.addSingleKVProperty('Consumer Property', 'consumerTestKey', 'consumerTestValue');
    cy.addSingleKVProperty('Data Format Property', 'dataFormatTestKey', 'dataFormatTestValue');
    cy.addSingleKVProperty('Api Property', 'apiTestKey', 'apiTestValue');
    cy.addSingleKVProperty('Cors Headers', 'corsHeadersTestKey', 'corsHeadersTestValue');

    cy.openSourceCode();

    cy.checkCodeSpanLine('- restConfiguration:');
    cy.checkCodeSpanLine('apiComponent: openapi');
    cy.checkCodeSpanLine('apiContextPath: testApiContextPath');
    cy.checkCodeSpanLine('apiContextRouteId: testApiContextRouteId');
    cy.checkCodeSpanLine('apiHost: testApiHost');
    cy.checkCodeSpanLine('useXForwardHeaders: true');
    cy.checkCodeSpanLine('apiVendorExtension: true');
    cy.checkCodeSpanLine('bindingMode: auto');
    cy.checkCodeSpanLine('clientRequestValidation: true');
    cy.checkCodeSpanLine('component: coap');
    cy.checkCodeSpanLine('contextPath: testContextPath');
    cy.checkCodeSpanLine('enableCORS: true');
    cy.checkCodeSpanLine('enableNoContentResponse: true');
    cy.checkCodeSpanLine('host: testHost');
    cy.checkCodeSpanLine('hostNameResolver: localIp');
    cy.checkCodeSpanLine('jsonDataFormat: testJsonDataFormat');
    cy.checkCodeSpanLine('port: "8080"');
    cy.checkCodeSpanLine('producerApiDoc: testProducerApiDoc');
    cy.checkCodeSpanLine('producerComponent: http');
    cy.checkCodeSpanLine('scheme: testScheme');
    cy.checkCodeSpanLine('skipBindingOnErrorCode: true');
    cy.checkCodeSpanLine('xmlDataFormat: testXmlDataFormat');
    cy.checkCodeSpanLine('componentProperty:');
    cy.checkCodeSpanLine('- key: componentTestKey');
    cy.checkCodeSpanLine('value: componentTestValue');
    cy.checkCodeSpanLine('apiProperty:');
    cy.checkCodeSpanLine('- key: apiTestKey');
    cy.checkCodeSpanLine('value: apiTestValue');
    cy.checkCodeSpanLine('consumerProperty:');
    cy.checkCodeSpanLine('- key: consumerTestKey');
    cy.checkCodeSpanLine('value: consumerTestValue');
    cy.checkCodeSpanLine('corsHeaders:');
    cy.checkCodeSpanLine('- key: corsHeadersTestKey');
    cy.checkCodeSpanLine('value: corsHeadersTestValue');
    cy.checkCodeSpanLine('dataFormatProperty:');
    cy.checkCodeSpanLine('- key: dataFormatTestKey');
    cy.checkCodeSpanLine('value: dataFormatTestValue');
    cy.checkCodeSpanLine('endpointProperty:');
    cy.checkCodeSpanLine('- key: endpointTestKey');
    cy.checkCodeSpanLine('value: endpointTestValue');
  });
});
