export const kameletYaml = `
apiVersion: camel.apache.org/v1alpha1
kind: Kamelet
metadata:
  annotations:
    camel.apache.org/kamelet.icon: whatever
  labels:
    camel.apache.org/kamelet.type: action
  name: eip-action
spec:
  definition:
    title: EIP Kamelet
    description: Used to test all EIP we implement
    properties: {}
  dependencies:
    - camel:core
    - camel:kamelet
  template:
    from:
      uri: kamelet:source
      steps:
        - loop:
            constant: '3'
            copy: true
            steps:
              - delay:
                  expression:
                    simple: \${body}
                  async-delayed: true
        - choice:
            when:
              - simple: '{{?foo}}'
                steps:
                  - dynamic-router:
                      expression:
                        simple: \${body}
                  - set-header:
                      name: bar
                      simple: foo
              - simple: '{{?bar}}'
                steps:
                  - set-property:
                      name: property
                      simple: bar
                  - remove-property:
                      name: property
                  - marshal:
                      json:
                        library: Gson
              - simple: '{{?baz}}'
                steps:
                  - transform:
                      simple: baz
                  - aggregate:
                      correlation-expression:
                        simple: \${header.StockSymbol}
                      aggregation-strategy: myAggregatorStrategy
                      completion-size: 2
                  - log:
                      message: test
                      logging-level: INFO
                      log-name: yaml
            otherwise:
              steps:
                - set-body:
                    simple: ola ke ase
                - remove-header:
                    name: removeme
                - claim-check:
                    operation: Push
                    key: foo
                    filter: header:(foo|bar)
        - to:
            uri: kamelet:sink`;

export const kameletJson = {
  apiVersion: 'camel.apache.org/v1alpha1',
  kind: 'Kamelet',
  metadata: {
    annotations: {
      'camel.apache.org/kamelet.icon': 'whatever',
    },
    labels: {
      'camel.apache.org/kamelet.type': 'action',
    },
    name: 'eip-action',
  },
  spec: {
    definition: {
      title: 'EIP Kamelet',
      description: 'Used to test all EIP we implement',
      properties: {},
    },
    dependencies: ['camel:core', 'camel:kamelet'],
    template: {
      from: {
        uri: 'kamelet:source',
        steps: [
          {
            loop: {
              constant: '3',
              copy: true,
              steps: [
                {
                  delay: {
                    expression: {
                      simple: '\\${body}',
                    },
                    'async-delayed': true,
                  },
                },
              ],
            },
          },
          {
            choice: {
              when: [
                {
                  simple: '{{?foo}}',
                  steps: [
                    {
                      'dynamic-router': {
                        expression: {
                          simple: '\\${body}',
                        },
                      },
                    },
                    {
                      'set-header': {
                        name: 'bar',
                        simple: 'foo',
                      },
                    },
                  ],
                },
                {
                  simple: '{{?bar}}',
                  steps: [
                    {
                      'set-property': {
                        name: 'property',
                        simple: 'bar',
                      },
                    },
                    {
                      'remove-property': {
                        name: 'property',
                      },
                    },
                    {
                      marshal: {
                        json: {
                          library: 'Gson',
                        },
                      },
                    },
                  ],
                },
                {
                  simple: '{{?baz}}',
                  steps: [
                    {
                      transform: {
                        simple: 'baz',
                      },
                    },
                    {
                      aggregate: {
                        'correlation-expression': {
                          simple: '\\${header.StockSymbol}',
                        },
                        'aggregation-strategy': 'myAggregatorStrategy',
                        'completion-size': 2,
                      },
                    },
                    {
                      log: {
                        message: 'test',
                        'logging-level': 'INFO',
                        'log-name': 'yaml',
                      },
                    },
                  ],
                },
              ],
              otherwise: {
                steps: [
                  {
                    'set-body': {
                      simple: 'ola ke ase',
                    },
                  },
                  {
                    'remove-header': {
                      name: 'removeme',
                    },
                  },
                  {
                    'claim-check': {
                      operation: 'Push',
                      key: 'foo',
                      filter: 'header:(foo|bar)',
                    },
                  },
                ],
              },
            },
          },
          {
            to: {
              uri: 'kamelet:sink`;',
            },
          },
        ],
      },
    },
  },
};
