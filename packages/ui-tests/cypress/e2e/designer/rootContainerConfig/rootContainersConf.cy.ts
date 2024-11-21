describe('Test for camel route root containers configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Canvas route wrap and unwrap', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.toggleRouteVisibility(1);

    cy.toggleExpandGroup('route-1234');
    cy.toggleExpandGroup('route-4321');

    cy.checkNodeExist('timer', 0);
    cy.checkNodeExist('log', 0);

    cy.toggleExpandGroup('route-4321');

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);
  });

  // Blocked by: https://github.com/KaotoIO/kaoto/issues/860
  it.skip('Canvas route wrap and unwrap, toggle visibility', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.toggleRouteVisibility(1);

    cy.toggleExpandGroup('route-1234');
    cy.toggleRouteVisibility(1);

    cy.checkNodeExist('timer', 0);
    cy.checkNodeExist('log', 0);
  });

  it('Canvas camel route container config', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('camel-route');

    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('description', 'test.description');
    cy.interactWithConfigInputObject('group', 'test.group');
    cy.interactWithConfigInputObject('inputType.description', 'test.inputType.description');
    cy.interactWithConfigInputObject('inputType.id', 'test.inputType.id');
    cy.interactWithConfigInputObject('inputType.urn', 'test.inputType.urn');
    cy.interactWithConfigInputObject('inputType.validate');
    cy.interactWithConfigInputObject('logMask');
    cy.interactWithConfigInputObject('messageHistory');
    cy.interactWithConfigInputObject('nodePrefixId', 'test.nodePrefixId');
    cy.interactWithConfigInputObject('outputType.description', 'test.outputType.description');
    cy.interactWithConfigInputObject('outputType.id', 'test.outputType.id');
    cy.interactWithConfigInputObject('outputType.urn', 'test.outputType.urn');
    cy.interactWithConfigInputObject('outputType.validate');
    cy.interactWithConfigInputObject('precondition', 'test.precondition');
    cy.interactWithConfigInputObject('routeConfigurationId', 'test.routeConfigurationId');
    cy.interactWithConfigInputObject('routePolicy', 'test.routePolicy');
    cy.interactWithConfigInputObject('startupOrder', 'test.startupOrder');
    cy.interactWithConfigInputObject('streamCache');
    cy.interactWithConfigInputObject('trace');

    cy.openSourceCode();

    cy.checkCodeSpanLine('description: test.description');
    cy.checkCodeSpanLine('group: test.group');
    cy.checkCodeSpanLine('inputType:');
    cy.checkCodeSpanLine('description: test.inputType.description');
    cy.checkCodeSpanLine('id: test.inputType.id');
    cy.checkCodeSpanLine('urn: test.inputType.urn');
    cy.checkCodeSpanLine('validate: true');
    cy.checkCodeSpanLine('logMask: true');
    cy.checkCodeSpanLine('messageHistory: true');
    cy.checkCodeSpanLine('validate: true');
    cy.checkCodeSpanLine('nodePrefixId: test.nodePrefixId');
    cy.checkCodeSpanLine('outputType:');
    cy.checkCodeSpanLine('description: test.outputType.description');
    cy.checkCodeSpanLine('id: test.outputType.id');
    cy.checkCodeSpanLine('urn: test.outputType.urn');
    cy.checkCodeSpanLine('validate: true');
    cy.checkCodeSpanLine('precondition: test.precondition');
    cy.checkCodeSpanLine('routeConfigurationId: test.routeConfigurationId');
    cy.checkCodeSpanLine('routePolicy: test.routePolicy');
    cy.checkCodeSpanLine('startupOrder: test.startupOrder');
    cy.checkCodeSpanLine('streamCache: true');
    cy.checkCodeSpanLine('trace: true');
  });

  it('Canvas kamelet container config', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('Produces periodic events about random users!');

    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('name', 'test.name');
    cy.interactWithConfigInputObject('title', 'test.title');
    cy.interactWithConfigInputObject('description', 'test.description');
    cy.selectInTypeaheadField('type', 'sink');
    cy.interactWithConfigInputObject('icon', 'test.icon');
    cy.interactWithConfigInputObject('supportLevel', 'test.supportLevel');
    cy.interactWithConfigInputObject('catalogVersion', 'test.catalogVersion');
    cy.interactWithConfigInputObject('provider', 'test.provider');
    cy.interactWithConfigInputObject('group', 'test.group');
    cy.interactWithConfigInputObject('namespace', 'test.namespace');
    cy.interactWithConfigInputObject('kameletProperties.0.name', 'test.properties.name');
    cy.interactWithConfigInputObject('kameletProperties.0.title', 'test.properties.title');
    cy.interactWithConfigInputObject('kameletProperties.0.description', 'test.properties.description');
    cy.interactWithConfigInputObject('kameletProperties.0.default', '1000');
    cy.addProperty('X-descriptors');
    cy.interactWithConfigInputObject('kameletProperties.0.x-descriptors.0', 'test.x-descriptors');

    cy.openSourceCode();

    cy.checkCodeSpanLine('name: test.name');
    cy.checkCodeSpanLine('title: test.title');
    cy.checkCodeSpanLine('camel.apache.org/kamelet.icon: test.icon');
    cy.checkCodeSpanLine('camel.apache.org/kamelet.support.level: test.supportLevel');
    cy.checkCodeSpanLine('camel.apache.org/kamelet.type: sink');
    cy.checkCodeSpanLine('camel.apache.org/catalog.version: test.catalogVersion');
    cy.checkCodeSpanLine('camel.apache.org/provider: test.provider');
    cy.checkCodeSpanLine('camel.apache.org/kamelet.group: test.group');
    cy.checkCodeSpanLine('camel.apache.org/kamelet.namespace: test.namespace');
    cy.checkCodeSpanLine('description: test.description');
    cy.checkCodeSpanLine('x-descriptors:');
    cy.checkCodeSpanLine('- test.x-descriptors');
  });

  it('Canvas pipe container config', () => {
    cy.uploadFixture('flows/pipe/basic.yaml');
    cy.openDesignPage();

    cy.openGroupConfigurationTab('pipe');

    cy.selectFormTab('All');
    cy.get(`input[name="name"]`).clear();
    cy.get(`input[name="name"]`).type('testName');

    cy.addStringProperty('labels', 'labelsTest', 'labelsValue');
    cy.addStringProperty('annotations', 'annotationsTest', 'annotationsValue');

    cy.openSourceCode();

    cy.checkCodeSpanLine('name: testName');
    cy.checkCodeSpanLine('labels:');
    cy.checkCodeSpanLine('labelsTest: labelsValue');
    cy.checkCodeSpanLine('annotations:');
    cy.checkCodeSpanLine('annotationsTest: annotationsValue');
  });

  it('Canvas route delete group button test', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.toggleRouteVisibility(1);

    cy.performNodeAction('route-4321', 'container-remove');
    cy.contains('button', 'Cancel').click();

    cy.checkNodeExist('timer', 2);
    cy.checkNodeExist('log', 2);

    cy.performNodeAction('route-4321', 'container-remove');
    cy.contains('button', 'Confirm').click();

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);
  });
});
