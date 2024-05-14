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
  annotations:
    sco1237896.github.com/catalog.group: "messaging"
    sco1237896.github.com/catalog.id: "http"
    sco1237896.github.com/connector.description: "Send data to a HTTP endpoint."
    sco1237896.github.com/connector.group: "messaging"
    sco1237896.github.com/connector.id: "http_sink_v1"
    sco1237896.github.com/connector.title: "HTTP sink"
    sco1237896.github.com/connector.version: "v1"
    trait.camel.apache.org/container.request-cpu: "0.20"
    trait.camel.apache.org/container.request-memory: "128M"
    trait.camel.apache.org/deployment.progress-deadline-seconds: "30"
    trait.camel.apache.org/container.image: "quay.io/sco1237896/connector-http:camel-4-1046a96"
spec:
  errorHandler:
    log:
      parameters:
        maximumRedeliveries: 3
        redeliveryDelay: 2000
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
    annotations: {
      'sco1237896.github.com/catalog.group': 'messaging',
      'sco1237896.github.com/catalog.id': 'http',
      'sco1237896.github.com/connector.description': 'Send data to a HTTP endpoint.',
      'sco1237896.github.com/connector.group': 'messaging',
      'sco1237896.github.com/connector.id': 'http_sink_v1',
      'sco1237896.github.com/connector.title': 'HTTP sink',
      'sco1237896.github.com/connector.version': 'v1',
      'trait.camel.apache.org/container.request-cpu': '0.20',
      'trait.camel.apache.org/container.request-memory': '128M',
      'trait.camel.apache.org/deployment.progress-deadline-seconds': '30',
      'trait.camel.apache.org/container.image': 'quay.io/sco1237896/connector-http:camel-4-1046a96',
    },
  },
  spec: {
    errorHandler: {
      log: {
        parameters: {
          maximumRedeliveries: 3,
          redeliveryDelay: 2000,
        },
      },
    },
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
        apiVersion: 'camel.apache.org/v1',
        name: 'log-sink',
      },
    },
  },
};

export const kameletBinding = new KameletBindingVisualEntity(kameletBindingJson);
