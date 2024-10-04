import { CamelRouteVisualEntity } from '../models/visualization/flows';

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
export const camelRouteJson = {
  route: {
    id: 'route-8888',
    from: {
      uri: 'timer',
      parameters: {
        timerName: 'tutorial',
      },
      steps: [
        {
          'set-header': {
            simple: '${random(2)}',
            name: 'myChoice',
          },
        },
        {
          choice: {
            when: [
              {
                simple: '${header.myChoice} == 1',
                steps: [
                  {
                    log: {
                      id: 'log-1',
                      message: 'We got a one.',
                    },
                  },
                ],
              },
            ],
            otherwise: {
              steps: [
                {
                  to: {
                    uri: 'amqp:queue:',
                  },
                },
                {
                  to: {
                    uri: 'amqp:queue:',
                  },
                },
                {
                  log: {
                    id: 'log-2',
                    message: 'We got a ${body}',
                  },
                },
              ],
            },
          },
        },
        {
          to: {
            uri: 'direct:my-route',
            parameters: {
              bridgeErrorHandler: true,
            },
          },
        },
      ],
    },
  },
};

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
                expression: {
                  simple: {
                    expression: "${exception.message} contains 'Damn'",
                  },
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
              onWhen: null,
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
};
export const camelRoute = new CamelRouteVisualEntity(camelRouteJson);
