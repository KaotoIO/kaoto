import { CamelRouteVisualEntity } from '@kaoto/kaoto/testing';
import { parse } from 'yaml';

const storybookCamelRoute = `
- route:
    id: route-2067
    from:
      id: from-2680
      uri: timer
      parameters:
        period: "1000"
        timerName: template
      steps:
        - aggregate:
            id: aggregate-3180
            aggregationStrategy: "#aggregationStrategy"
            correlationExpression:
              simple:
                expression: \${variable.valid} == true
        - marshal:
            id: marshal-3336
            jaxb:
              contextPath: org.kaoto.io
        - resequence:
            id: resequence-2887
            batchConfig:
              batchSize: 50
              batchTimeout: "2000"
            constant:
              expression: "true"
        - saga:
            id: saga-1418
        - setHeader:
            id: setHeader-2101
            constant:
              expression: "true"
            name: status
        - tokenizer:
            id: tokenizer-1732
            langChain4jParagraphTokenizer:
              maxOverlap: 1500
              maxTokens: 200000
              tokenizerType: QWEN
- beans:
    - name: aggregationStrategy
      type: org.apache.camel.AggregationStrategy
`;

export const storybookCamelRouteEntity: CamelRouteVisualEntity = new CamelRouteVisualEntity(
  parse(storybookCamelRoute)[0],
);
