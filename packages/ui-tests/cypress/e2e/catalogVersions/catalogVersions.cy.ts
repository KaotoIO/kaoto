import catalogLibrary from '@kaoto/camel-catalog/index.json';

describe('Test for catalog versions', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const testData: { version: string; type: string }[] = [];

  catalogLibrary.definitions.forEach((library) => {
    const catalogVersion = library.version;
    const catalogType = library.runtime;

    testData.push({
      version: `Camel ${catalogType} ${catalogVersion}`,
      type: catalogType,
    });
  });

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
      cy.checkExpressionConfigInputObject('simple.expression', 'testExpression');
      cy.checkExpressionConfigInputObject('simple.id', 'testId');
      cy.checkConfigInputObject('name', 'testName');

      cy.openStepConfigurationTab('log', 0);
      cy.selectFormTab('All');
      // Check the configured fields didn't change in the node
      cy.checkConfigInputObject('description', 'log');
      cy.checkConfigInputObject('logName', 'testLoggerName');
      cy.expandWrappedSection('#-Advanced');
      cy.checkConfigInputObject('marker', 'testMarker');

      cy.selectPrependNode('log');
      cy.chooseFromCatalog('component', 'amqp');
      cy.checkNodeExist('amqp', 1);
    });
  });
});
