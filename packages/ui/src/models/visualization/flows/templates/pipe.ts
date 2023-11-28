import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

export const pipeTemplate = () => {
  return `
  apiVersion: camel.apache.org/v1
  kind: Pipe
  metadata:
    name: ${getCamelRandomId('pipe')}
  spec:
    source:
      ref:
        kind: Kamelet
        apiVersion: camel.apache.org/v1
        name: timer-source
        properties:
          message: hello
    sink:
      ref:
        kind: Kamelet
        apiVersion: camel.apache.org/v1
        name: log-sink`;
};
