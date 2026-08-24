describe('Test Camel Route source-to-canvas-to-source round trip', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const getRouteLines = (sourceCode: string, routeId: string): string[] => {
    const routeStart = sourceCode.indexOf(`id: ${routeId}`);
    const nextRouteStart = sourceCode.indexOf('\n- route:', routeStart);
    const routeSlice = sourceCode.slice(routeStart, nextRouteStart === -1 ? sourceCode.length : nextRouteStart);
    return routeSlice.split('\n').map((l) => l.trim());
  };

  const toDslVariants = [
    {
      name: 'expanded to with separated uri and parameters',
      routeId: 'route-expanded-uri-parameters',
      stepName: 'log',
      stepIndex: 0,
      sourceCheckLines: ['- to:', 'uri: log', 'loggerName: testing', "showHeaders: 'true'"],
      updatedSourceCheckLines: ['- to:', 'uri: log', 'loggerName: changed-testing', 'showHeaders: "true"'],
    },
    {
      name: 'expanded to with inline uri path',
      routeId: 'route-expanded-inline-uri',
      stepName: 'log',
      stepIndex: 1,
      sourceCheckLines: ['- to:', 'uri: log:testing?showHeaders=true'],
      updatedSourceCheckLines: ['- to:', 'uri: log', 'showHeaders: true', 'loggerName: changed-testing'],
    },
    {
      name: 'scalar to with separated uri parameters in query',
      routeId: 'route-scalar-uri-parameters',
      stepName: 'to',
      stepIndex: 0,
      sourceCheckLines: ['- to: log?loggerName=testing&showHeaders=true'],
      updatedSourceCheckLines: ['- to:', 'uri: log?loggerName=changed-testing&showHeaders=true'],
    },
    {
      name: 'scalar to with inline uri path and query',
      routeId: 'route-scalar-inline-uri',
      stepName: 'log',
      stepIndex: 2,
      sourceCheckLines: ['- to: log:testing?showHeaders=true'],
      updatedSourceCheckLines: ['- to:', 'uri: log', 'showHeaders: true', 'loggerName: changed-testing'],
    },
  ];

  it('renders the shared fixture in the canvas', () => {
    cy.uploadFixture('flows/camelRoute/camelRouteRoundTrip.yaml');

    cy.openDesignPage();
    cy.showAllRoutes();
    cy.checkNodeExist('timer', 4);
    cy.checkNodeExist('log', 3);
    cy.checkNodeExist('to', 1);
    cy.get('[data-testid="flows-list-route-count"]').should('have.text', '4/4');
  });

  toDslVariants.forEach(({ name, routeId, stepName, stepIndex, sourceCheckLines, updatedSourceCheckLines }) => {
    it('loads ' + name + ' from source code and preserves valid DSL after form edits', () => {
      cy.uploadFixture('flows/camelRoute/camelRouteRoundTrip.yaml');

      // Check the initial source lines are correct for this route
      cy.openSourceCode();
      cy.getMonacoValue().then(({ sourceCode }) => {
        const routeLines = getRouteLines(sourceCode, routeId);
        sourceCheckLines.forEach((line) => {
          expect(routeLines).to.include(line.trim());
        });
      });

      // Open the design page, select the step and update loggerName via the form
      cy.openDesignPage();
      cy.showAllRoutes();
      cy.openStepConfigurationTab(stepName, stepIndex);
      cy.selectFormTab('All');
      if (routeId === 'route-scalar-uri-parameters') {
        cy.get('[data-testid="#.uri--edit"]').click();
        cy.get('[data-testid="#.uri--text-input"]').clear().type('log?loggerName=changed-testing&showHeaders=true');
        cy.get('[data-testid="#.uri--save"]').click();
      } else {
        cy.interactWithConfigInputObject('parameters.loggerName', 'changed-testing');
      }
      cy.closeStepConfigurationTab();

      // Check the updated source lines are correct for this route only.
      // Assert that original lines not carried over into the updated representation are absent,
      // then verify the expected updated representation is present.
      cy.openSourceCode();
      cy.getMonacoValue().then(({ sourceCode }) => {
        const routeLines = getRouteLines(sourceCode, routeId);
        const updatedTrimmed = updatedSourceCheckLines.map((l) => l.trim());
        sourceCheckLines
          .map((l) => l.trim())
          .filter((l) => !updatedTrimmed.includes(l))
          .forEach((line) => {
            expect(routeLines, `original line still present after edit: "${line}"`).to.not.include(line);
          });
        updatedSourceCheckLines.forEach((line) => {
          expect(routeLines, `expected updated line missing: "${line.trim()}"`).to.include(line.trim());
        });
      });
    });
  });
});
