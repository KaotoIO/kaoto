describe('Tests for Design page', { browser: '!firefox' }, () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.allowClipboardAccess();
  });

  it('Design - Copy steps in CamelRoute', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('timer');
    cy.assertValueCopiedToClipboard({
      name: 'from',
      definition: {
        uri: 'timer:test',
        steps: [
          { setHeader: { constant: 'test', name: 'test' } },
          { marshal: { id: 'marshal-3801' } },
          { to: { uri: 'log:test' } },
        ],
      },
    });

    cy.selectCopyNode('setHeader');
    cy.assertValueCopiedToClipboard({
      name: 'setHeader',
      definition: { constant: 'test', name: 'test' },
    });

    cy.selectCopyNode('camel-route');
    cy.assertValueCopiedToClipboard({
      name: 'route',
      definition: {
        id: 'camel-route',
        from: {
          uri: 'timer:test',
          steps: [
            { setHeader: { constant: 'test', name: 'test' } },
            { marshal: { id: 'marshal-3801' } },
            { to: { uri: 'log:test' } },
          ],
        },
      },
    });
  });

  it('Design - Copy steps in Pipe', () => {
    cy.uploadFixture('flows/pipe/pipeWithSteps.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('timer-source');
    cy.assertValueCopiedToClipboard({
      name: 'timer-source',
      definition: {
        properties: { message: 'hello' },
        ref: { apiVersion: 'camel.apache.org/v1', kind: 'Kamelet', name: 'timer-source' },
      },
    });

    cy.selectCopyNode('delay-action');
    cy.assertValueCopiedToClipboard({
      name: 'delay-action',
      definition: { ref: { apiVersion: 'camel.apache.org/v1', kind: 'Kamelet', name: 'delay-action' } },
    });

    cy.selectCopyNode('log-sink');
    cy.assertValueCopiedToClipboard({
      name: 'log-sink',
      definition: { ref: { apiVersion: 'camel.apache.org/v1', kind: 'Kamelet', name: 'log-sink' } },
    });
  });

  it('Design - Copy steps in Kamelets', () => {
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('kamelet:sink');
    cy.assertValueCopiedToClipboard({
      name: 'to',
      definition: { uri: 'kamelet:sink', parameters: {} },
    });

    cy.selectCopyNode('eip-action');
    cy.assertValueCopiedToClipboard({
      name: 'kamelet',
      definition: {
        apiVersion: 'camel.apache.org/v1alpha1',
        kind: 'Kamelet',
        metadata: {
          annotations: { 'camel.apache.org/kamelet.icon': 'whatever' },
          labels: { 'camel.apache.org/kamelet.type': 'action' },
          name: 'eip-action',
        },
        spec: {
          definition: {
            title: 'kamelet-2082',
            type: 'object',
            properties: {
              period: {
                title: 'Period',
                description: 'The time interval between two events',
                type: 'integer',
                default: 5000,
              },
            },
          },
          types: { out: { mediaType: 'application/json' } },
          dependencies: ['camel:timer', 'camel:http', 'camel:kamelet'],
          template: {
            from: {
              id: 'from-1870',
              uri: 'timer:user',
              parameters: { period: '{{period}}' },
              steps: [
                { setBody: { id: 'setBody-3387', expression: { simple: {} } } },
                { marshal: { id: 'marshal-1414' } },
                { to: { uri: 'kamelet:sink', parameters: {} } },
              ],
            },
          },
        },
      },
    });
  });

  it('Design - Copy errorHandler', () => {
    cy.uploadFixture('flows/camelRoute/errorHandlerRoute.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('errorHandler');
    cy.assertValueCopiedToClipboard({
      name: 'errorHandler',
      definition: {
        defaultErrorHandler: {
          level: 'ERROR',
          redeliveryPolicy: {
            backOffMultiplier: '2.0',
            collisionAvoidanceFactor: '0.15',
            maximumRedeliveryDelay: '60000',
            redeliveryDelay: '1000',
            retriesExhaustedLogLevel: 'ERROR',
            retryAttemptedLogInterval: '1',
            retryAttemptedLogLevel: 'DEBUG',
          },
        },
      },
    });
  });

  it('Design - Copy RouteConfiguration', () => {
    cy.uploadFixture('flows/camelRoute/routeConfiguration.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('routeConfiguration');
    cy.assertValueCopiedToClipboard({
      name: 'routeConfiguration',
      definition: {
        id: 'routeConfiguration-6082',
        description: 'routeConfiguration',
        intercept: [
          {
            intercept: {
              id: 'intercept-1234',
              description: 'intercept',
              steps: [{ log: { id: 'log-4033', message: '${body}' } }],
            },
          },
        ],
        interceptFrom: [
          {
            interceptFrom: {
              id: 'interceptFrom-2113',
              description: 'interceptFrom',
              steps: [{ log: { id: 'log-7932', message: '${body}' } }],
            },
          },
        ],
        interceptSendToEndpoint: [
          {
            interceptSendToEndpoint: {
              id: 'interceptSendToEndpoint-3320',
              description: 'interceptSendToEndpoint',
              steps: [{ log: { id: 'log-3882', message: '${body}' } }],
            },
          },
        ],
        onCompletion: [],
      },
    });
  });
});
