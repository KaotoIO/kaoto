export const integrationYaml = `
apiVersion: camel.apache.org/v1
kind: Integration
metadata:
  name: Integration-1
spec:
  flows:
  - route:
    id: route-1234
    from:
      uri: cron:cron
      parameters:
        schedule: '1000'
      steps:
      - set-body:
        simple: body
      - to:
        uri: log:log1
  - route:
    id: route-4321
    from:
      uri: timer:test
      steps:
        - to:
          uri: log:log2`;

export const integrationJson = {
  apiVersion: 'camel.apache.org/v1',
  kind: 'Integration',
  metadata: {
    name: 'Integration-1',
  },
  spec: {
    flows: [
      {
        route: null,
        id: 'route-1234',
        from: {
          uri: 'cron:cron',
          parameters: {
            schedule: '1000',
          },
          steps: [
            {
              'set-body': null,
              simple: 'body',
            },
            {
              to: null,
              uri: 'log:log1',
            },
          ],
        },
      },
      {
        route: null,
        id: 'route-4321',
        from: {
          uri: 'timer:test',
          steps: [
            {
              to: null,
              uri: 'log:log2`',
            },
          ],
        },
      },
    ],
  },
};
