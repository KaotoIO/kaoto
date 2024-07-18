import { parse } from 'yaml';

export const camelRouteBranch = parse(`
- route:
    id: route-2768
    from:
      id: from-4014
      uri: timer:template
      parameters:
        period: "1000"
      steps:
        - choice:
            id: choice-3431
            otherwise:
              id: otherwise-3653
              steps:
                - log:
                    id: log-6808
                    message: \${body}
            when:
              - id: when-4112
                steps:
                  - setHeader:
                      id: setHeader-6078
                      expression:
                        simple: {}
                expression:
                  simple:
                    expression: \${header.foo} == 1
        - to:
            id: to-3757
            uri: sql
            parameters: {}
`);
