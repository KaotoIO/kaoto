import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

/**
 * This is a stub Camel Route in YAML format.
 * It is used to test the Canvas component.
 */
export const camelRouteYaml = `
- route:
    id: route-8888
    from:
      uri: timer
      parameters:
        timerName: tutorial
      steps:
      - set-header:
          simple: "\${random(2)}"
          name: myChoice
      - choice:
          when:
          - simple: "\${header.myChoice} == 1"
            steps:
            - log:
                id: log-1
                message: We got a one.
          otherwise:
            steps:
            - to:
                uri: 'amqp:queue:'
            - to:
                uri: 'amqp:queue:'
            - log:
                id: log-2
                message: "We got a \${body}"
      - to:
          uri: direct:my-route
          parameters:
            bridgeErrorHandler: true
`;

/**
 * This is a stub Camel Route in JSON format.
 * It is used to test the Canvas component.
 */
export const camelRouteJson: { route: RouteDefinition } = parse(camelRouteYaml)[0];

export const camelRouteWithDisabledSteps: { route: RouteDefinition } = parse(`
route:
  id: route-8888
  from:
    uri: timer
    steps:
      - log:
          disabled: true
          message: \${body}
      - to:
          uri: direct
          disabled: true
`);
