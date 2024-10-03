export const camelRouteYaml_1_1_original = `
- route:
    id: route-3376
    from:
      id: from-3505
      uri: rest
      parameters:
        host: localhost
        method: post
        path: /newCustomer
      steps: []
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
