import { KameletBinding } from '../models/camel-entities';

/**
 * This is a stub KameletBinding in YAML format.
 * It is used to test the Canvas component.
 */
export const kameletYaml = `
apiVersion: camel.apache.org/v1alpha1
kind: KameletBinding
metadata:
  name: integration
spec:
  source:
    ref:
      apiVersion: camel.apache.org/v1alpha1
      name: chuck-norris-source
      kind: Kamelet
  steps:
    - ref:
        apiVersion: camel.apache.org/v1alpha1
        name: chunk-template-action
        kind: Kamelet
  sink:
    ref:
      apiVersion: camel.apache.org/v1alpha1
      name: kafka-sink
      kind: Kamelet
`;

/**
 * This is a stub KameletBinding in JSON format.
 * It is used to test the Canvas component.
 */
export const kameletBindingJson = {
  apiVersion: 'camel.apache.org/v1alpha1',
  kind: 'KameletBinding',
  metadata: {
    name: 'integration',
  },
  spec: {
    source: {
      ref: {
        apiVersion: 'camel.apache.org/v1alpha1',
        name: 'chuck-norris-source',
        kind: 'Kamelet',
      },
    },
    steps: [
      {
        ref: {
          apiVersion: 'camel.apache.org/v1alpha1',
          name: 'chunk-template-action',
          kind: 'Kamelet',
        },
      },
    ],
    sink: {
      ref: {
        apiVersion: 'camel.apache.org/v1alpha1',
        name: 'kafka-sink',
        kind: 'Kamelet',
      },
    },
  },
};

export const kametletBinding = new KameletBinding(kameletBindingJson);
