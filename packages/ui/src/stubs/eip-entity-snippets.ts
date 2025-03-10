// packages/ui/src/stubs/eip-entity-snippets.ts

export const aggregateEntity = {
  steps: [{ to: { uri: 'mock:result' } }],
  aggregationStrategy: 'myAppender',
  aggregationStrategyMethodAllowNull: 'true',
  aggregationStrategyMethodName: 'append',
  completionPredicate: {
    constant: { expression: 'predicate' },
  },
  completionSize: '3',
  completionSizeExpression: {
    header: { expression: 'head' },
  },
  completionTimeoutExpression: { datasonnet: { expression: 'datasonnet' } },
  correlationExpression: {
    constant: { expression: 'true', resultType: 'java.lang.Integer' },
  },
};

export const circuitBreakerEntity = {
  steps: [{ to: { uri: 'http://fooservice.com/slow' } }],
  onFallback: { steps: [{ transform: { constant: { expression: 'Fallback message' } } }] },
};

export const filterEntity = {
  xpath: { expression: "/person[@name='James']" },
  steps: [{ to: { uri: 'mock:result' } }],
};

export const loadBalanceEntity = {
  steps: [{ to: { uri: 'seda:x' } }, { to: { uri: 'seda:y' } }, { to: { uri: 'seda:z' } }],
  roundRobinLoadBalancer: {},
};

export const loopEntity = {
  steps: [{ to: { uri: 'mock:result' } }],
  header: { expression: 'loop' },
};

export const multicastEntity = {
  steps: [{ to: { uri: 'direct:b' } }, { to: { uri: 'direct:c' } }, { to: { uri: 'direct:d' } }],
  parallelProcessing: 'true',
  timeout: '5000',
  aggregationStrategy: '#class:com.foo.MyAggregationStrategy',
};

export const pipelineEntity = {
  steps: [{ to: { uri: 'bean:foo' } }, { to: { uri: 'bean:bar' } }, { to: { uri: 'activemq:wine' } }],
};

export const resequenceEntity = {
  steps: [{ to: { uri: 'mock:result' } }],
  simple: { expression: 'body' },
  batchConfig: {
    batchSize: '300',
    batchTimeout: '4000',
  },
};

export const sagaEntity = {
  compensation: { uri: 'direct:compensation' },
  completion: { uri: 'direct:completion' },
  option: [
    { key: 'myOptionKey', constant: { expression: 'myOptionValue' } },
    { key: 'myOptionKey2', constant: { expression: 'myOptionValue2' } },
  ],
  steps: [],
};

export const splitEntity = {
  parallelProcessing: 'true',
  simple: { expression: 'body' },
  steps: [{ to: { uri: 'direct:b' } }, { to: { uri: 'direct:c' } }, { to: { uri: 'direct:d' } }],
};

export const choiceEntity = {
  when: [{ xpath: { expression: '/ns1:foo/' }, steps: [{ to: { uri: 'mock:bar' } }] }],
  otherwise: { steps: [{ to: { uri: 'mock:other' } }] },
};

export const doTryEntity = {
  steps: [{ to: { uri: 'mock:try' } }],
  doCatch: [
    {
      exception: ['java.lang.Exception'],
      steps: [{ to: { uri: 'mock:catch' } }],
    },
  ],
  doFinally: {
    steps: [{ to: { uri: 'mock:finally' } }],
  },
};

export const deadLetterChannelEntity = {
  deadLetterChannel: {
    deadLetterUri: 'mock:dead',
    redeliveryPolicy: { maximumRedeliveries: '3', redeliveryDelay: '250' },
  },
};

export const enrichEntity = {
  simple: { expression: 'http:myserver/${header.orderId}/order' },
};

export const dynamicRouterEntity = {
  method: { beanType: 'com.foo.MySlipBean', method: 'slip' },
};

export const recipientListEntity = {
  parallelProcessing: 'true',
  header: { expression: 'myHeader' },
};

export const routingSlipEntity = {
  ignoreInvalidEndpoints: 'true',
  header: { expression: 'myHeader' },
};

export const throttleEntity = {
  timePeriodMillis: '10000',
  constant: { expression: '3' },
};

export const sampleEntity = {
  samplePeriod: '5000',
  // to is missing in the catalog currently
  // { to: { uri: 'direct:sampled' } }],
};
