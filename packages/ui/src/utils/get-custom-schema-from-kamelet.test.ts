import { cloneDeep } from 'lodash';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { IKameletDefinition, IKameletSpecProperty } from '../models/kamelets-catalog';
import { getCustomSchemaFromKamelet } from './get-custom-schema-from-kamelet';

describe('getCustomSchemaFromKamelet', () => {
  let inputKameletStruct: IKameletDefinition;

  beforeEach(() => {
    inputKameletStruct = {
      apiVersion: 'camel.apache.org/v1',
      kind: SourceSchemaType.Kamelet,
      metadata: {
        annotations: {
          'camel.apache.org/catalog.version': 'main-SNAPSHOT',
          'camel.apache.org/kamelet.group': 'Users',
          'camel.apache.org/kamelet.icon':
            'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIGQ9Ik00OC4wMTQsNDIuODg5bC05LjU1My00Ljc3NkMzNy41NiwzNy42NjIsMzcsMzYuNzU2LDM3LDM1Ljc0OHYtMy4zODFjMC4yMjktMC4yOCwwLjQ3LTAuNTk5LDAuNzE5LTAuOTUxCgljMS4yMzktMS43NSwyLjIzMi0zLjY5OCwyLjk1NC01Ljc5OUM0Mi4wODQsMjQuOTcsNDMsMjMuNTc1LDQzLDIydi00YzAtMC45NjMtMC4zNi0xLjg5Ni0xLTIuNjI1di01LjMxOQoJYzAuMDU2LTAuNTUsMC4yNzYtMy44MjQtMi4wOTItNi41MjVDMzcuODU0LDEuMTg4LDM0LjUyMSwwLDMwLDBzLTcuODU0LDEuMTg4LTkuOTA4LDMuNTNDMTcuNzI0LDYuMjMxLDE3Ljk0NCw5LjUwNiwxOCwxMC4wNTYKCXY1LjMxOWMtMC42NCwwLjcyOS0xLDEuNjYyLTEsMi42MjV2NGMwLDEuMjE3LDAuNTUzLDIuMzUyLDEuNDk3LDMuMTA5YzAuOTE2LDMuNjI3LDIuODMzLDYuMzYsMy41MDMsNy4yMzd2My4zMDkKCWMwLDAuOTY4LTAuNTI4LDEuODU2LTEuMzc3LDIuMzJsLTguOTIxLDQuODY2QzguODAxLDQ0LjQyNCw3LDQ3LjQ1OCw3LDUwLjc2MlY1NGMwLDQuNzQ2LDE1LjA0NSw2LDIzLDZzMjMtMS4yNTQsMjMtNnYtMy4wNDMKCUM1Myw0Ny41MTksNTEuMDg5LDQ0LjQyNyw0OC4wMTQsNDIuODg5eiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
          'camel.apache.org/kamelet.namespace': 'test',
          'camel.apache.org/kamelet.support.level': 'Stable',
          'camel.apache.org/provider': 'Apache Software Foundation',
          foo: 'bar',
        },
        labels: {
          'camel.apache.org/kamelet.type': 'Action',
          type: 'Action',
        },
        name: 'test',
      },
      spec: {
        definition: {
          description: 'test description!',
          properties: {
            period: {
              default: 5000,
              description: 'The time interval between two events',
              title: 'Period',
              type: 'integer',
            },
          },
          title: 'kamelet-35256',
          type: 'object',
        },
        dependencies: ['camel:timer', 'camel:http', 'camel:kamelet'],
        template: {
          from: {
            steps: [
              {
                to: {
                  uri: 'https',
                  parameters: {
                    httpUri: 'random-data-api.com/api/v2/users',
                  },
                },
              },
              {
                to: 'kamelet:sink',
              },
            ],
            id: 'from-3836',
            parameters: {
              period: '{{period}}',
              timerName: 'user',
            },
            uri: 'timer',
          },
        },
        types: {
          out: {
            mediaType: 'application/json',
          },
        },
      },
    };
  });

  it('should get a custom kamelet definition from a empty kamelet', () => {
    const expectedCustomSchema = {
      name: '',
      title: '',
      description: '',
      type: undefined,
      icon: undefined,
      supportLevel: undefined,
      catalogVersion: undefined,
      provider: undefined,
      group: undefined,
      namespace: undefined,
      labels: {},
      annotations: {},
      kameletProperties: [],
    };

    const customSchema = getCustomSchemaFromKamelet({} as IKameletDefinition);
    expect(customSchema).toEqual(expectedCustomSchema);
  });

  it('should get a custom kamelet definition from a kamelet official spec', () => {
    const expectedCustomSchema = {
      name: 'test',
      title: 'kamelet-35256',
      description: 'test description!',
      type: 'Action',
      icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIGQ9Ik00OC4wMTQsNDIuODg5bC05LjU1My00Ljc3NkMzNy41NiwzNy42NjIsMzcsMzYuNzU2LDM3LDM1Ljc0OHYtMy4zODFjMC4yMjktMC4yOCwwLjQ3LTAuNTk5LDAuNzE5LTAuOTUxCgljMS4yMzktMS43NSwyLjIzMi0zLjY5OCwyLjk1NC01Ljc5OUM0Mi4wODQsMjQuOTcsNDMsMjMuNTc1LDQzLDIydi00YzAtMC45NjMtMC4zNi0xLjg5Ni0xLTIuNjI1di01LjMxOQoJYzAuMDU2LTAuNTUsMC4yNzYtMy44MjQtMi4wOTItNi41MjVDMzcuODU0LDEuMTg4LDM0LjUyMSwwLDMwLDBzLTcuODU0LDEuMTg4LTkuOTA4LDMuNTNDMTcuNzI0LDYuMjMxLDE3Ljk0NCw5LjUwNiwxOCwxMC4wNTYKCXY1LjMxOWMtMC42NCwwLjcyOS0xLDEuNjYyLTEsMi42MjV2NGMwLDEuMjE3LDAuNTUzLDIuMzUyLDEuNDk3LDMuMTA5YzAuOTE2LDMuNjI3LDIuODMzLDYuMzYsMy41MDMsNy4yMzd2My4zMDkKCWMwLDAuOTY4LTAuNTI4LDEuODU2LTEuMzc3LDIuMzJsLTguOTIxLDQuODY2QzguODAxLDQ0LjQyNCw3LDQ3LjQ1OCw3LDUwLjc2MlY1NGMwLDQuNzQ2LDE1LjA0NSw2LDIzLDZzMjMtMS4yNTQsMjMtNnYtMy4wNDMKCUM1Myw0Ny41MTksNTEuMDg5LDQ0LjQyNyw0OC4wMTQsNDIuODg5eiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
      supportLevel: 'Stable',
      catalogVersion: 'main-SNAPSHOT',
      provider: 'Apache Software Foundation',
      group: 'Users',
      namespace: 'test',
      labels: {
        type: 'Action',
      },
      annotations: {
        foo: 'bar',
      },
      kameletProperties: [
        {
          name: 'period',
          default: 5000,
          description: 'The time interval between two events',
          title: 'Period',
          type: 'integer',
        },
      ],
    };

    const customSchema = getCustomSchemaFromKamelet(inputKameletStruct as unknown as IKameletDefinition);
    expect(customSchema).toEqual(expectedCustomSchema);
  });

  it('should get a custom kamelet definition from a kamelet with string properties', () => {
    const kameletWithStringProperties = cloneDeep(inputKameletStruct);
    kameletWithStringProperties.spec.definition.properties = test as unknown as Record<string, IKameletSpecProperty>;

    const expectedCustomSchema = {
      name: 'test',
      title: 'kamelet-35256',
      description: 'test description!',
      type: 'Action',
      icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIGQ9Ik00OC4wMTQsNDIuODg5bC05LjU1My00Ljc3NkMzNy41NiwzNy42NjIsMzcsMzYuNzU2LDM3LDM1Ljc0OHYtMy4zODFjMC4yMjktMC4yOCwwLjQ3LTAuNTk5LDAuNzE5LTAuOTUxCgljMS4yMzktMS43NSwyLjIzMi0zLjY5OCwyLjk1NC01Ljc5OUM0Mi4wODQsMjQuOTcsNDMsMjMuNTc1LDQzLDIydi00YzAtMC45NjMtMC4zNi0xLjg5Ni0xLTIuNjI1di01LjMxOQoJYzAuMDU2LTAuNTUsMC4yNzYtMy44MjQtMi4wOTItNi41MjVDMzcuODU0LDEuMTg4LDM0LjUyMSwwLDMwLDBzLTcuODU0LDEuMTg4LTkuOTA4LDMuNTNDMTcuNzI0LDYuMjMxLDE3Ljk0NCw5LjUwNiwxOCwxMC4wNTYKCXY1LjMxOWMtMC42NCwwLjcyOS0xLDEuNjYyLTEsMi42MjV2NGMwLDEuMjE3LDAuNTUzLDIuMzUyLDEuNDk3LDMuMTA5YzAuOTE2LDMuNjI3LDIuODMzLDYuMzYsMy41MDMsNy4yMzd2My4zMDkKCWMwLDAuOTY4LTAuNTI4LDEuODU2LTEuMzc3LDIuMzJsLTguOTIxLDQuODY2QzguODAxLDQ0LjQyNCw3LDQ3LjQ1OCw3LDUwLjc2MlY1NGMwLDQuNzQ2LDE1LjA0NSw2LDIzLDZzMjMtMS4yNTQsMjMtNnYtMy4wNDMKCUM1Myw0Ny41MTksNTEuMDg5LDQ0LjQyNyw0OC4wMTQsNDIuODg5eiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
      supportLevel: 'Stable',
      catalogVersion: 'main-SNAPSHOT',
      provider: 'Apache Software Foundation',
      group: 'Users',
      namespace: 'test',
      labels: {
        type: 'Action',
      },
      annotations: {
        foo: 'bar',
      },
      kameletProperties: [],
    };

    const customSchema = getCustomSchemaFromKamelet(kameletWithStringProperties as unknown as IKameletDefinition);
    expect(customSchema).toEqual(expectedCustomSchema);
  });

  it('should get a custom kamelet definition from a kamelet with malformed properties', () => {
    const kameletWithMalformedProperties = {
      apiVersion: 'camel.apache.org/v1',
      kind: SourceSchemaType.Kamelet,
      metadata: {
        annotations: {
          'camel.apache.org/catalog.version': 'main-SNAPSHOT',
          'camel.apache.org/kamelet.group': 'Users',
          'camel.apache.org/kamelet.icon':
            'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIGQ9Ik00OC4wMTQsNDIuODg5bC05LjU1My00Ljc3NkMzNy41NiwzNy42NjIsMzcsMzYuNzU2LDM3LDM1Ljc0OHYtMy4zODFjMC4yMjktMC4yOCwwLjQ3LTAuNTk5LDAuNzE5LTAuOTUxCgljMS4yMzktMS43NSwyLjIzMi0zLjY5OCwyLjk1NC01Ljc5OUM0Mi4wODQsMjQuOTcsNDMsMjMuNTc1LDQzLDIydi00YzAtMC45NjMtMC4zNi0xLjg5Ni0xLTIuNjI1di01LjMxOQoJYzAuMDU2LTAuNTUsMC4yNzYtMy44MjQtMi4wOTItNi41MjVDMzcuODU0LDEuMTg4LDM0LjUyMSwwLDMwLDBzLTcuODU0LDEuMTg4LTkuOTA4LDMuNTNDMTcuNzI0LDYuMjMxLDE3Ljk0NCw5LjUwNiwxOCwxMC4wNTYKCXY1LjMxOWMtMC42NCwwLjcyOS0xLDEuNjYyLTEsMi42MjV2NGMwLDEuMjE3LDAuNTUzLDIuMzUyLDEuNDk3LDMuMTA5YzAuOTE2LDMuNjI3LDIuODMzLDYuMzYsMy41MDMsNy4yMzd2My4zMDkKCWMwLDAuOTY4LTAuNTI4LDEuODU2LTEuMzc3LDIuMzJsLTguOTIxLDQuODY2QzguODAxLDQ0LjQyNCw3LDQ3LjQ1OCw3LDUwLjc2MlY1NGMwLDQuNzQ2LDE1LjA0NSw2LDIzLDZzMjMtMS4yNTQsMjMtNnYtMy4wNDMKCUM1Myw0Ny41MTksNTEuMDg5LDQ0LjQyNyw0OC4wMTQsNDIuODg5eiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
          'camel.apache.org/kamelet.namespace': 'test',
          'camel.apache.org/kamelet.support.level': 'Stable',
          'camel.apache.org/provider': 'Apache Software Foundation',
          foo: 'bar',
        },
        labels: {
          'camel.apache.org/kamelet.type': 'Action',
          type: 'Action',
        },
        name: 'test',
      },
      spec: {
        definition: {
          description: 'test description!',
          properties: {
            period: test,
          },
          title: 'kamelet-35256',
          type: 'object',
        },
        dependencies: ['camel:timer', 'camel:http', 'camel:kamelet'],
        template: {
          from: {
            steps: [
              {
                to: {
                  uri: 'https',
                  parameters: {
                    httpUri: 'random-data-api.com/api/v2/users',
                  },
                },
              },
              {
                to: 'kamelet:sink',
              },
            ],
            id: 'from-3836',
            parameters: {
              period: '{{period}}',
              timerName: 'user',
            },
            uri: 'timer',
          },
        },
        types: {
          out: {
            mediaType: 'application/json',
          },
        },
      },
    };

    const expectedCustomSchema = {
      name: 'test',
      title: 'kamelet-35256',
      description: 'test description!',
      type: 'Action',
      icon: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgNjAgNjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDYwIDYwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIGQ9Ik00OC4wMTQsNDIuODg5bC05LjU1My00Ljc3NkMzNy41NiwzNy42NjIsMzcsMzYuNzU2LDM3LDM1Ljc0OHYtMy4zODFjMC4yMjktMC4yOCwwLjQ3LTAuNTk5LDAuNzE5LTAuOTUxCgljMS4yMzktMS43NSwyLjIzMi0zLjY5OCwyLjk1NC01Ljc5OUM0Mi4wODQsMjQuOTcsNDMsMjMuNTc1LDQzLDIydi00YzAtMC45NjMtMC4zNi0xLjg5Ni0xLTIuNjI1di01LjMxOQoJYzAuMDU2LTAuNTUsMC4yNzYtMy44MjQtMi4wOTItNi41MjVDMzcuODU0LDEuMTg4LDM0LjUyMSwwLDMwLDBzLTcuODU0LDEuMTg4LTkuOTA4LDMuNTNDMTcuNzI0LDYuMjMxLDE3Ljk0NCw5LjUwNiwxOCwxMC4wNTYKCXY1LjMxOWMtMC42NCwwLjcyOS0xLDEuNjYyLTEsMi42MjV2NGMwLDEuMjE3LDAuNTUzLDIuMzUyLDEuNDk3LDMuMTA5YzAuOTE2LDMuNjI3LDIuODMzLDYuMzYsMy41MDMsNy4yMzd2My4zMDkKCWMwLDAuOTY4LTAuNTI4LDEuODU2LTEuMzc3LDIuMzJsLTguOTIxLDQuODY2QzguODAxLDQ0LjQyNCw3LDQ3LjQ1OCw3LDUwLjc2MlY1NGMwLDQuNzQ2LDE1LjA0NSw2LDIzLDZzMjMtMS4yNTQsMjMtNnYtMy4wNDMKCUM1Myw0Ny41MTksNTEuMDg5LDQ0LjQyNyw0OC4wMTQsNDIuODg5eiIvPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
      supportLevel: 'Stable',
      catalogVersion: 'main-SNAPSHOT',
      provider: 'Apache Software Foundation',
      group: 'Users',
      namespace: 'test',
      labels: {
        type: 'Action',
      },
      annotations: {
        foo: 'bar',
      },
      kameletProperties: [],
    };

    const customSchema = getCustomSchemaFromKamelet(kameletWithMalformedProperties as unknown as IKameletDefinition);
    expect(customSchema).toEqual(expectedCustomSchema);
  });
});
