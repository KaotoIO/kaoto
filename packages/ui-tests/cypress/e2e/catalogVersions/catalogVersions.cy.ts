describe('Test for catalog versions', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const testData = [
    { type: 'Main', version: 'Camel Main 4.11.0' },
    { type: 'Main', version: 'Camel Main 4.10.2' },
    { type: 'Main', version: 'Camel Main 4.4.0.redhat-00046' },
    { type: 'Main', version: 'Camel Main 4.8.3.redhat-00004' },
    { type: 'Main', version: 'Camel Main 4.8.5' },
    { type: 'Quarkus', version: 'Camel Quarkus 3.19.0' },
    { type: 'Quarkus', version: 'Camel Quarkus 3.15.3' },
    { type: 'Quarkus', version: 'Camel Quarkus 3.15.0.redhat-00010' },
    { type: 'Quarkus', version: 'Camel Quarkus 3.8.0.redhat-00018' },
    { type: 'Spring Boot', version: 'Camel Spring Boot 4.4.0.redhat-00039' },
    { type: 'Spring Boot', version: 'Camel Spring Boot 4.8.3.redhat-00009' },
    { type: 'Spring Boot', version: 'Camel Spring Boot 4.8.5' },
    { type: 'Spring Boot', version: 'Camel Spring Boot 4.10.2' },
    { type: 'Spring Boot', version: 'Camel Spring Boot 4.11.0' },
  ];
  testData.forEach((data) => {
    it(`Catalog version test for ${data.version}`, { tags: ['weekly'] }, () => {
      cy.uploadFixture('flows/camelRoute/catalogConfig.yaml');
      cy.openDesignPage();

      cy.hoverOnRuntime(data.type);
      cy.get(`[data-testid^="runtime-selector-${data.version}"] button.pf-v6-c-menu__item`)
        .first()
        .click({ force: true });
      cy.get('body').then((body) => {
        if (body.find('[testid="loading-schemas"]').length > 0) {
          cy.waitSchemasLoading();
        }
      });

      cy.openStepConfigurationTab('timer', 0);
      cy.selectFormTab('All');
      // Check the configured fields didn't change in the node
      cy.checkConfigInputObject('parameters.timerName', 'testTimerName');
      cy.checkConfigInputObject('parameters.delay', '2000');
      cy.checkConfigInputObject('parameters.period', '2000');
      cy.checkConfigInputObject('parameters.repeatCount', '10');

      cy.openStepConfigurationTab('setHeader', 0);
      cy.selectFormTab('All');
      // Check the configured fields didn't change in the node
      cy.checkConfigInputObject('expression', 'testExpression');
      cy.checkConfigInputObject('id', 'testId');
      cy.checkConfigInputObject('name', 'testName');

      cy.openStepConfigurationTab('log', 0);
      cy.selectFormTab('All');
      // Check the configured fields didn't change in the node
      cy.checkConfigInputObject('description', 'log');
      cy.checkConfigInputObject('logName', 'testLoggerName');
      cy.contains('button', 'Processor advanced properties').click();
      cy.checkConfigInputObject('marker', 'testMarker');

      cy.selectPrependNode('log');
      cy.chooseFromCatalog('component', 'amqp');
      cy.checkNodeExist('amqp', 1);
    });
  });
});
