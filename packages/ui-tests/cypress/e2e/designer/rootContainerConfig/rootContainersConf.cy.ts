describe('Test for camel route root containers configuration', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Canvas route wrap and unwrap', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.toggleRouteVisibility(1);

    cy.get('[data-id^="route-1234"]')
      .find('.pf-topology__group__label')
      .find('.pf-topology__node__action-icon')
      .eq(0)
      .click();

    cy.get('[data-id^="route-4321"]')
      .find('.pf-topology__group__label')
      .find('.pf-topology__node__action-icon')
      .eq(0)
      .click();
    cy.checkNodeExist('timer', 0);
    cy.checkNodeExist('log', 0);
    cy.get('[data-id^="route-4321"]')
      .find('.pf-topology__group__label')
      .find('.pf-topology__node__action-icon')
      .eq(0)
      .click();
    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);
  });

  // Blocked by: https://github.com/KaotoIO/kaoto/issues/860
  it.skip('Canvas route wrap and unwrap, toggle visibility', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();
    cy.toggleRouteVisibility(1);
    cy.get('[data-id^="route-1234"]')
      .find('.pf-topology__group__label')
      .find('.pf-topology__node__action-icon')
      .click();
    cy.toggleRouteVisibility(1);
    cy.checkNodeExist('timer', 0);
    cy.checkNodeExist('log', 0);
  });

  it('Canvas camel route container config', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.get('[data-id^="camel-route"]')
      .find('.pf-topology__group__label')
      .find('.pf-topology__node__label__background')
      .click();

    cy.get(`textarea[name="description"]`).clear().type('test.description');
    cy.get(`input[name="group"]`).clear().type('test.group');
    cy.get(`textarea[name="inputType.description"]`).clear().type('test.inputType.description');
    cy.get(`input[name="inputType.id"]`).clear().type('test.inputType.id');
    cy.get(`input[name="inputType.urn"]`).clear().type('test.inputType.urn');
    cy.get(`input[name="inputType.validate"]`).check();
    cy.get(`input[name="logMask"]`).check();
    cy.get(`input[name="messageHistory"]`).check();
    cy.get(`input[name="nodePrefixId"]`).clear().type('test.nodePrefixId');
    cy.get(`textarea[name="outputType.description"]`).clear().type('test.outputType.description');
    cy.get(`input[name="outputType.id"]`).clear().type('test.outputType.id');
    cy.get(`input[name="outputType.urn"]`).clear().type('test.outputType.urn');
    cy.get(`input[name="outputType.validate"]`).check();
    cy.get(`input[name="precondition"]`).clear().type('test.precondition');
    cy.get(`input[name="routeConfigurationId"]`).clear().type('test.routeConfigurationId');
    cy.get(`input[name="routePolicy"]`).clear().type('test.routePolicy');
    cy.get(`input[name="startupOrder"]`).clear().type('test.startupOrder');
    cy.get(`input[name="streamCache"]`).check();
    cy.get(`input[name="trace"]`).check();

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
});
