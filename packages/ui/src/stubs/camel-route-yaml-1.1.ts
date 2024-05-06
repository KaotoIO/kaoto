export const camelRouteYaml_1_1_original = `
- route:
    id: route-3376
    from:
      id: from-3505
      uri: rest:post:/newCustomer
      parameters:
        host: localhost
      steps: []
`;

export const camelRouteYaml_1_1_updated = `
- route:
    id: route-3376
    from:
      id: from-3505
      uri: rest:post:/newCustomer
      parameters:
        bindingMode: "off"
        host: localhost
      steps: []
`;
