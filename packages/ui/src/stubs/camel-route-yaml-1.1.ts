export const camelRouteYaml_1_1_original = `
- route:
    from:
      id: from-3505
      parameters:
        host: localhost
        method: post
        path: /newCustomer
      steps: []
      uri: rest
    id: route-3376
`;

export const camelRouteYaml_1_1_updated = `
- route:
    id: route-3376
    from:
      id: from-3505
      uri: rest
      parameters:
        bindingMode: "off"
        host: localhost
        method: post
        path: /newCustomer
      steps: []
`;
