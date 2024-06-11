describe('Test for root on rest configuration container', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Root onException config', () => {
    cy.selectCamelRouteType('Rest', 'restConfiguration');

    cy.get('[data-id^="restConfiguration"]')
      .find('.pf-topology__node__label')
      .find('.pf-topology__node__label__background')
      .click();

    cy.selectInTypeaheadField('component', 'coap');
    cy.selectInTypeaheadField('apiComponent', 'openapi');
    cy.selectInTypeaheadField('producerComponent', 'http');
    cy.get(`input[name="scheme"]`).clear().type('testScheme');
    cy.get(`input[name="host"]`).clear().type('testHost');
    cy.get(`input[name="port"]`).clear().type('8080');
    cy.get(`input[name="apiHost"]`).clear().type('testApiHost');
    cy.get(`input[name="useXForwardHeaders"]`).check();
    cy.get(`input[name="producerApiDoc"]`).clear().type('testProducerApiDoc');
    cy.get(`input[name="contextPath"]`).clear().type('testContextPath');
    cy.get(`input[name="apiContextPath"]`).clear().type('testApiContextPath');
    cy.get(`input[name="apiContextRouteId"]`).clear().type('testApiContextRouteId');
    cy.get(`input[name="apiVendorExtension"]`).check();
    cy.selectInTypeaheadField('hostNameResolver', 'localIp');
    cy.selectInTypeaheadField('bindingMode', 'auto');
    cy.get(`input[name="skipBindingOnErrorCode"]`).check();
    cy.get(`input[name="clientRequestValidation"]`).check();
    cy.get(`input[name="enableCORS"]`).check();
    cy.get(`input[name="enableNoContentResponse"]`).check();
    cy.get(`input[name="inlineRoutes"]`).check();
    cy.get(`input[name="jsonDataFormat"]`).clear().type('testJsonDataFormat');
    cy.get(`input[name="xmlDataFormat"]`).clear().type('testXmlDataFormat');

    cy.addSingleProperty('Component Property', 'componentTestKey', 'componentTestValue');
    cy.addSingleProperty('Endpoint Property', 'endpointTestKey', 'endpointTestValue');
    cy.addSingleProperty('Consumer Property', 'consumerTestKey', 'consumerTestValue');
    cy.addSingleProperty('Data Format Property', 'dataFormatTestKey', 'dataFormatTestValue');
    cy.addSingleProperty('Api Property', 'apiTestKey', 'apiTestValue');
    cy.addSingleProperty('Cors Headers', 'corsHeadersTestKey', 'corsHeadersTestValue');

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
