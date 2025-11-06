describe('Test for root on rest configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root rest configuration', { browser: '!firefox' }, () => {
    cy.selectCamelRouteType('Rest', 'restConfiguration');

    cy.openStepConfigurationTab('restConfiguration');

    cy.selectFormTab('All');
    cy.expandWrappedSection('#-Advanced');
    cy.expandWrappedSection('#-Producer (advanced)');
    cy.expandWrappedSection('#-Consumer (advanced)');

    cy.selectInTypeaheadField('component', 'coap');
    cy.selectInTypeaheadField('apiComponent', 'openapi');
    cy.selectInTypeaheadField('producerComponent', 'vertx-http');
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
    cy.selectInTypeaheadField('jsonDataFormat', 'gson');
    cy.selectInTypeaheadField('xmlDataFormat', 'jacksonXml');

    cy.addSingleKVProperty('componentProperty', 'componentTestKey', 'componentTestValue');
    cy.addSingleKVProperty('endpointProperty', 'endpointTestKey', 'endpointTestValue');
    cy.addSingleKVProperty('consumerProperty', 'consumerTestKey', 'consumerTestValue');
    cy.addSingleKVProperty('dataFormatProperty', 'dataFormatTestKey', 'dataFormatTestValue');
    cy.addSingleKVProperty('apiProperty', 'apiTestKey', 'apiTestValue');
    cy.addSingleKVProperty('corsHeaders', 'corsHeadersTestKey', 'corsHeadersTestValue');

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
    cy.checkCodeSpanLine('jsonDataFormat: gson');
    cy.checkCodeSpanLine('port: "8080"');
    cy.checkCodeSpanLine('producerApiDoc: testProducerApiDoc');
    cy.checkCodeSpanLine('producerComponent: vertx-http');
    cy.checkCodeSpanLine('scheme: testScheme');
    cy.checkCodeSpanLine('skipBindingOnErrorCode: true');
    cy.checkCodeSpanLine('xmlDataFormat: jacksonXml');
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
