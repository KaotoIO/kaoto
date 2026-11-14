import { NewProjectFile } from '../../services/project-files/project-file';

const timerToLogRoute = (id: string, uri: string) => `- route:
    id: ${id}
    from:
      uri: ${uri}
      parameters:
        period: "5000"
      steps:
        - setBody:
            constant: Hello from ${id}
        - to:
            uri: log:${id}
`;

const kafkaRoute = (id: string, from: string, to: string) => `- route:
    id: ${id}
    from:
      uri: ${from}
      steps:
        - to:
            uri: ${to}
`;

/**
 * Files a project starts with until projects can be created or opened.
 *
 * The ids are the ones of the former stub tree, so that the existing integration links keep working.
 */
export const SEED_PROJECT_FILES: NewProjectFile[] = [
  {
    id: 'main-flow',
    path: 'integrations/main-flow.camel.yaml',
    type: 'integration',
    content: `- route:
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
  },
  {
    id: 'error-handler',
    path: 'integrations/error-handler.camel.yaml',
    type: 'integration',
    content: `- errorHandler:
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
  },
  {
    id: 'order-test',
    path: 'integrations/order-test.citrus.yaml',
    type: 'integration-test',
    content: `name: order-test
actions:
  - print:
      message: Testing the order flow
`,
  },
  {
    id: 'timer-source',
    path: 'integrations/timer-source.kamelet.yaml',
    type: 'integration',
    content: `apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: timer-source
  labels:
    camel.apache.org/kamelet.type: source
spec:
  definition:
    title: Timer Source
    description: Produces periodic events
    type: object
    properties:
      message:
        title: Message
        type: string
  template:
    from:
      uri: timer:tick
      steps:
        - setBody:
            constant: "{{message}}"
        - to: kamelet:sink
`,
  },
  {
    id: 'orders-pipe',
    path: 'integrations/orders.pipe.yaml',
    type: 'integration',
    content: `apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: orders
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: timer-source
    properties:
      message: New order
  sink:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: log-sink
`,
  },
  {
    id: 'legacy-route',
    path: 'integrations/legacy-route.xml',
    type: 'integration',
    content: `<camel>
    <route id="legacy-route">
        <from uri="timer:legacy?period=5000"/>
        <setBody>
            <constant>Hello from legacy-route</constant>
        </setBody>
        <to uri="log:legacy-route"/>
    </route>
</camel>
`,
  },
  {
    id: 'rest-api',
    path: 'integrations/routes/rest-api.camel.yaml',
    type: 'integration',
    content: `- rest:
    path: /orders
    get:
      - to: direct:list-orders
- route:
    id: list-orders
    from:
      uri: direct:list-orders
      steps:
        - setBody:
            constant: "[]"
`,
  },
  {
    id: 'batch-job',
    path: 'integrations/routes/batch-job.camel.yaml',
    type: 'integration',
    content: timerToLogRoute('batch-job', 'timer:batch'),
  },
  {
    id: 'kafka-consumer',
    path: 'integrations/routes/async/kafka-consumer.camel.yaml',
    type: 'integration',
    content: kafkaRoute('kafka-consumer', 'kafka:orders', 'log:kafka-consumer'),
  },
  {
    id: 'kafka-producer',
    path: 'integrations/routes/async/kafka-producer.camel.yaml',
    type: 'integration',
    content: kafkaRoute('kafka-producer', 'timer:produce', 'kafka:orders'),
  },
  { id: 'schema', path: 'resources/schema.xsd', type: 'document', content: '' },
  { id: 'mapping', path: 'resources/mapping.xsl', type: 'document', content: '' },
  { id: 'order-template', path: 'resources/templates/order-template.json', type: 'document', content: '' },
  { id: 'invoice-template', path: 'resources/templates/invoice-template.json', type: 'document', content: '' },
];
