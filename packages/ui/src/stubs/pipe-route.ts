import { Pipe } from '../models/visualization/flows';

/**
 * This is a stub Pipe in YAML format.
 * It is used to test the Canvas component.
 */
export const pipeYaml = `
apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: webhook-binding
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: webhook-source
  steps:
    - ref:
        kind: Kamelet
        apiVersion: camel.apache.org/v1
        name: delay-action
  sink:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: log-sink`;

/**
 * This is a stub Pipe in JSON format.
 * It is used to test the Canvas component.
 */
export const pipeJson = {
  apiVersion: 'camel.apache.org/v1',
  kind: 'Pipe',
  metadata: {
    name: 'webhook-binding',
  },
  spec: {
    source: {
      ref: {
        kind: 'Kamelet',
        apiVersion: 'camel.apache.org/v1',
        name: 'webhook-source',
      },
    },
    steps: [
      {
        ref: {
          kind: 'Kamelet',
          apiVersion: 'camel.apache.org/v1',
          name: 'delay-action',
        },
      },
    ],
    sink: {
      ref: {
        kind: 'Kamelet',
        apiVersion: 'camel.apache.org/v1alpha1',
        name: 'log-sink',
      },
    },
  },
};

export const pipe = new Pipe(pipeJson);
