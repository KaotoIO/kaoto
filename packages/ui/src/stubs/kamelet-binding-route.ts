import { KameletBindingVisualEntity } from '../models/visualization/flows';

/**
 * This is a stub KameletBinding in YAML format.
 * It is used to test the Canvas component.
 */
export const kameletBindingYaml = `
apiVersion: camel.apache.org/v1
kind: KameletBinding
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
 * This is a stub KameletBinding in JSON format.
 * It is used to test the Canvas component.
 */
export const kameletBindingJson = {
  apiVersion: 'camel.apache.org/v1',
  kind: 'KameletBinding',
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

export const kameletBinding = new KameletBindingVisualEntity(
  kameletBindingJson.spec.source,
  kameletBindingJson.spec.steps,
  kameletBindingJson.spec.sink,
);
