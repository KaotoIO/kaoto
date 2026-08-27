describe('Test Camel Route source-to-canvas-to-source round trip', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const runRoundTripTest = (
    fixture: string,
    getRouteLines: (sourceCode: string, routeId: string) => string[],
    variant: {
      routeId: string;
      stepName: string;
      stepIndex: number;
      sourceCheckLines: string[];
      updatedSourceCheckLines?: string[];
      editViaUriInput?: boolean;
      uriInputValue?: string;
    },
  ) => {
    cy.uploadFixture(fixture);

    // Check the initial source lines are correct for this route
    cy.openSourceCode();
    cy.getMonacoValue().then(({ sourceCode }) => {
      const routeLines = getRouteLines(sourceCode, variant.routeId);
      variant.sourceCheckLines.forEach((line) => {
        expect(routeLines).to.include(line.trim());
      });
    });

    if (!variant.updatedSourceCheckLines) return;

    // Open the design page, select the step and update loggerName via the form
    cy.openDesignPage();
    cy.showAllRoutes();
    cy.openStepConfigurationTab(variant.stepName, variant.stepIndex);
    cy.selectFormTab('All');
    if (variant.editViaUriInput) {
      cy.get('[data-testid="#.uri--edit"]').click();
      cy.get('[data-testid="#.uri--text-input"]').clear().type(variant.uriInputValue!);
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
      const routeLines = getRouteLines(sourceCode, variant.routeId);
      // updatedSourceCheckLines is guaranteed defined here — the early return above guards this branch
      const updatedLines = variant.updatedSourceCheckLines!;
      const updatedTrimmed = updatedLines.map((l) => l.trim());
      variant.sourceCheckLines
        .map((l) => l.trim())
        .filter((l) => !updatedTrimmed.includes(l))
        .forEach((line) => {
          expect(routeLines, `original line still present after edit: "${line}"`).to.not.include(line);
        });
      updatedLines.forEach((line) => {
        expect(routeLines, `expected updated line missing: "${line.trim()}"`).to.include(line.trim());
      });
    });
  };

  describe('YAML', () => {
    const fixture = 'flows/camelRoute/camelRouteRoundTrip.yaml';

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
        editViaUriInput: true,
        uriInputValue: 'log?loggerName=changed-testing&showHeaders=true',
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
      cy.uploadFixture(fixture);

      cy.openDesignPage();
      cy.showAllRoutes();
      cy.checkNodeExist('timer', 4);
      cy.checkNodeExist('log', 3);
      cy.checkNodeExist('to', 1);
      cy.get('[data-testid="flows-list-route-count"]').should('have.text', '4/4');
    });

    toDslVariants.forEach((variant) => {
      it('loads ' + variant.name + ' from source code and preserves valid DSL after form edits', () => {
        runRoundTripTest(fixture, getRouteLines, variant);
      });
    });
  });

  describe('XML', () => {
    const fixture = 'flows/camelRoute/camelRouteRoundTrip.xml';

    const getRouteLines = (sourceCode: string, routeId: string): string[] => {
      const routeStart = sourceCode.indexOf(`id="${routeId}"`);
      const nextRouteStart = sourceCode.indexOf('<route ', routeStart + 1);
      const routeSlice = sourceCode.slice(routeStart, nextRouteStart === -1 ? sourceCode.length : nextRouteStart);
      return routeSlice.split('\n').map((l) => l.trim());
    };

    const toDslVariants = [
      {
        name: 'loggerName in query string, showHeaders in query string',
        routeId: 'route-query-logger-query-headers',
        stepName: 'to',
        stepIndex: 0,
        sourceCheckLines: [
          '<to id="to-query-logger-query-headers" uri="log?loggerName=testing&amp;showHeaders=true"/>',
        ],
        updatedSourceCheckLines: [
          '<to id="to-query-logger-query-headers" uri="log?loggerName=changed-testing&amp;showHeaders=true"/>',
        ],
        editViaUriInput: true,
        uriInputValue: 'log?loggerName=changed-testing&showHeaders=true',
      },
      {
        name: 'loggerName as path component, showHeaders in query string',
        routeId: 'route-path-logger-query-headers',
        stepName: 'log',
        stepIndex: 0,
        sourceCheckLines: ['<to id="to-path-logger-query-headers" uri="log:testing?showHeaders=true"/>'],
        updatedSourceCheckLines: ['<to id="to-path-logger-query-headers" uri="log:changed-testing?showHeaders=true"/>'],
      },
      {
        name: 'loggerName as path component, no query string',
        routeId: 'route-path-logger-only',
        stepName: 'log',
        stepIndex: 1,
        sourceCheckLines: ['<to id="to-path-logger-only" uri="log:testing"/>'],
        updatedSourceCheckLines: ['<to id="to-path-logger-only" uri="log:changed-testing"/>'],
      },
      {
        name: 'loggerName in query string only, no showHeaders',
        routeId: 'route-query-logger-only',
        stepName: 'to',
        stepIndex: 1,
        sourceCheckLines: ['<to id="to-query-logger-only" uri="log?loggerName=testing"/>'],
        updatedSourceCheckLines: ['<to id="to-query-logger-only" uri="log?loggerName=changed-testing"/>'],
        editViaUriInput: true,
        uriInputValue: 'log?loggerName=changed-testing',
      },
      {
        name: 'loggerName as path component, multiple query params',
        routeId: 'route-path-logger-multi-params',
        stepName: 'log',
        stepIndex: 2,
        sourceCheckLines: [
          '<to id="to-path-logger-multi-params" uri="log:testing?showHeaders=true&amp;logMask=true&amp;level=WARN"/>',
        ],
        updatedSourceCheckLines: [
          '<to id="to-path-logger-multi-params" uri="log:changed-testing?showHeaders=true&amp;logMask=true&amp;level=WARN"/>',
        ],
      },
    ];

    it('renders the shared fixture in the canvas', () => {
      cy.uploadFixture(fixture);

      cy.openDesignPage();
      cy.showAllRoutes();
      cy.checkNodeExist('timer', 5);
      cy.checkNodeExist('log', 3);
      cy.checkNodeExist('to', 2);
      cy.get('[data-testid="flows-list-route-count"]').should('have.text', '5/5');
    });

    toDslVariants.forEach((variant) => {
      it('loads ' + variant.name + ' from source code and preserves valid DSL after form edits', () => {
        runRoundTripTest(fixture, getRouteLines, variant);
      });
    });
  });
});
