import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { CamelRouteVisualEntity } from '../models';

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

export const doTryCamelRouteXml =
  '<route id="route-1137"> ' +
  ' <from uri="direct:start"/>\n' +
  '  <doTry>\n' +
  '    <process ref="processorFail"/>\n' +
  '    <to uri="mock:result"/>\n' +
  "    <doCatch id='first'>\n" +
  '      <exception>java.io.IOException</exception>\n' +
  '      <exception>java.lang.IllegalStateException</exception>\n' +
  '      <onWhen>\n' +
  "        <simple>${exception.message} contains 'Damn'</simple>\n" +
  '      </onWhen>\n' +
  '      <to uri="mock:catch"/>\n' +
  '    </doCatch >\n' +
  '    <doCatch id="second">\n' +
  '      <exception>org.apache.camel.CamelExchangeException</exception>\n' +
  '      <to uri="mock:catchCamel"/>\n' +
  '    </doCatch>\n' +
  '    <doFinally>\n' +
  '       <to uri="mock:finally"/>\n' +
  '    </doFinally>\n' +
  '  </doTry>\n' +
  '</route>';
export const doTryCamelRouteJson = {
  route: {
    id: 'route-1137',
    from: {
      uri: 'direct:start',
      steps: [
        {
          doTry: {
            steps: [
              {
                process: {
                  ref: 'processorFail',
                },
              },
              {
                to: {
                  uri: 'mock:result',
                },
              },
            ],
            doCatch: [
              {
                id: 'first',
                steps: [
                  {
                    to: {
                      uri: 'mock:catch',
                    },
                  },
                ],
                exception: ['java.io.IOException', 'java.lang.IllegalStateException'],
                onWhen: {
                  simple: {
                    expression: "${exception.message} contains 'Damn'",
                  },
                },
              },
              {
                id: 'second',
                steps: [
                  {
                    to: {
                      uri: 'mock:catchCamel',
                    },
                  },
                ],
                exception: ['org.apache.camel.CamelExchangeException'],
              },
            ],
            doFinally: {
              steps: [
                {
                  to: {
                    uri: 'mock:finally',
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
};

export const camelRoute = new CamelRouteVisualEntity(camelRouteJson);

export const camelRouteYamlWithDM = `
- route:
    id: route-3076
    from:
      id: from-1837
      uri: timer
      parameters:
        period: "1000"
        timerName: template
      steps:
        - step:
            id: kaoto-datamapper-657b6637
            steps:
              - to:
                  id: kaoto-datamapper-xslt-3158
                  uri: xslt-saxon
                  parameters:
                    failOnNullBody: false
        - to:
            id: to-4027
            uri: activemq
            parameters: {}
`;
export const camelRouteJsonWithDM: { route: RouteDefinition } = parse(camelRouteYamlWithDM)[0];
