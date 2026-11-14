/**
 * Placeholder contents for the integrations of the stub file tree (see `../explorer`).
 * Keyed by the explorer file id — replaced by real VFS data in a future story.
 */
export const STUB_INTEGRATION_CONTENT: Record<string, string> = {
  'main-flow': `- route:
    id: main-flow
    from:
      uri: timer:orders
      parameters:
        period: "5000"
      steps:
        - setBody:
            simple: "Order \${random(1000)}"
        - choice:
            when:
              - simple: "\${body} contains '1'"
                steps:
                  - log:
                      message: "Priority order: \${body}"
            otherwise:
              steps:
                - log:
                    message: "Standard order: \${body}"
        - to:
            uri: log:orders
`,
  'error-handler': `- errorHandler:
    deadLetterChannel:
      deadLetterUri: log:dead-letters
- route:
    id: error-handler-route
    from:
      uri: timer:failing
      parameters:
        period: "10000"
      steps:
        - setBody:
            constant: Failing payload
        - throwException:
            exceptionType: java.lang.IllegalStateException
            message: Simulated failure
`,
};

export const getStubIntegrationContent = (integrationId: string): string | undefined =>
  STUB_INTEGRATION_CONTENT[integrationId];
