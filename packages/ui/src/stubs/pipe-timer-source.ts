export const pipeTimerSourceYaml = `
apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: timer-event-source
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: timer-source
    properties:
      message: "Hello world!"
  sink:
    ref:
      kind: InMemoryChannel
      apiVersion: messaging.knative.dev/v1
      name: messages
`;
