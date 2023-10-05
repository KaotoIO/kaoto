export const pipeYaml = `
- apiVersion: camel.apache.org/v1
  kind: Pipe
  metadata:
    name: redhat-test
  spec:
    source:
      ref:
        apiVersion: camel.apache.org/v1
        name: log-action
        kind: Kamelet
        properties:
          showHeaders: "true"
  sink:
    ref:
      apiVersion: camel.apache.org/v1
      name: kafka-sink
      kind: Kamelet
      properties:
        topic: myTopic
        bootstrapServers: 192.168.0.1
        user: test2
        password: test

`;

export const pipeJson = {
  apiVersion: 'camel.apache.org/v1',
  kind: 'Pipe',
  metadata: {
    name: 'redhat-test',
  },
  spec: {
    source: {
      ref: {
        apiVersion: 'camel.apache.org/v1',
        name: 'timer-source',
        kind: 'Kamelet',
        properties: {
          period: '10000',
          message: 'Hello',
        },
      },
    },
    steps: [
      {
        ref: {
          apiVersion: 'camel.apache.org/v1',
          name: 'log-sink',
          kind: 'Kamelet',
          properties: {
            showHeaders: 'true',
          },
        },
      },
    ],
    sink: {
      ref: {
        apiVersion: 'camel.apache.org/v1',
        name: 'kafka-sink',
        kind: 'Kamelet',
        properties: {
          topic: 'myTopic',
          bootstrapServers: '192.168.0.1',
          user: 'test2',
          password: 'test',
        },
      },
    },
  },
};
