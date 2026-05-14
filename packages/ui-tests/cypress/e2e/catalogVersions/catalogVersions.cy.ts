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
      // Extract version number from the full version string (e.g., "Camel Quarkus 4.18.1" -> "4.18.1")
      // Safe extraction: split by space and take the last part (avoids ReDoS)
      const parts = data.version.split(' ');
      const catalogVersion = parts.length > 0 ? parts[parts.length - 1] : undefined;

      // Select the specific catalog version via Settings
      cy.openSettings();
      cy.get('[data-testid="camelCatalog-catalog-selector-toggle"]')
        .should('exist')
        .and('be.visible')
        .click({ force: true });
      if (catalogVersion) {
        cy.get('.pf-v6-c-menu__item').contains(`Camel ${data.type} ${catalogVersion}`).click({ force: true });
      } else {
        // Fallback: select first catalog for this runtime
        cy.get('.pf-v6-c-menu__group')
          .contains(data.type)
          .parent()
          .parent()
          .within(() => {
            cy.get('.pf-v6-c-menu__item').first().click({ force: true });
          });
      }
      cy.get('[data-testid="settings-form-save-btn"]').click();
      cy.waitSchemasLoading();

      cy.uploadFixture('flows/camelRoute/catalogConfig.yaml');
      cy.openDesignPage();

      // Verify the correct catalog is displayed
      cy.checkRuntimeDisplay(data.type, catalogVersion);

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
