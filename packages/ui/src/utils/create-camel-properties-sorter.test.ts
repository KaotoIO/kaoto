import { Pair, parse, stringify } from 'yaml';
import { CamelRouteResource } from '../models/camel';
import { CamelKResource } from '../models/camel/camel-k-resource';
import { createCamelPropertiesSorter } from './create-camel-properties-sorter';

describe('camelPropertiesSorter', () => {
  it('should sort the Camel Route', () => {
    const camelRouteYaml = `
- route:
    id: route-1398
    from:
      description: my descriptio
      uri: timer
      id: "1"
      steps:
        - to:
            parameters:
              disableReplyTo: true
              synchronous: true
              transferException: true
            uri: amqp
            id: to-8385
        - to:
            id: to-2786
            uri: whatsapp
            parameters:
              baseUri: /
              lazyStartProducer: true
      parameters:
        delay: "{{delay}}"
        fixedRate: true
        includeMetadata: true
        period: 50.75
        synchronous: true
        timerName: timer-1-1`;

    const rawObject = parse(camelRouteYaml);

    const result = stringify(rawObject, {
      sortMapEntries: createCamelPropertiesSorter(CamelRouteResource.PARAMETERS_ORDER) as (a: Pair, b: Pair) => number,
    });

    expect(result).toMatchSnapshot();
  });

  it('should sort Pipes', () => {
    const pipeYaml = `
    spec:
      steps:
        - ref:
            apiVersion: camel.apache.org/v1
            kind: Kamelet
            name: delay-action
            properties:
              milliseconds: "100"
      sink:
        ref:
          apiVersion: camel.apache.org/v1
          kind: Kamelet
          name: log-sink
      source:
        ref:
          apiVersion: camel.apache.org/v1
          kind: Kamelet
          name: timer-source
          properties:
            message: hello
            repeatCount: jjj
    kind: Pipe
    metadata:
      name: pipe-1748
    apiVersion: camel.apache.org/v1`;

    const rawObject = parse(pipeYaml);
    const result = stringify(rawObject, {
      sortMapEntries: createCamelPropertiesSorter(CamelKResource.PARAMETERS_ORDER) as (a: Pair, b: Pair) => number,
    });

    expect(result).toMatchSnapshot();
  });
});
