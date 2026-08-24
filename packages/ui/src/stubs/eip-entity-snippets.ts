// packages/ui/src/stubs/eip-entity-snippets.ts

import {
  Choice,
  CircuitBreaker,
  DoTry,
  DynamicRouter,
  Enrich,
  ErrorHandler,
  Filter1,
  LoadBalance,
  Loop,
  Pipeline,
  RecipientList,
  Resequence,
  RoutingSlip,
  Saga,
  Sample,
  Split,
  Throttle,
} from '@kaoto/camel-catalog/types';

export const aggregateEntity = {
  steps: [{ to: { uri: 'mock', parameters: { name: 'result' } } }],
  aggregationStrategy: 'myAppender',
  aggregationStrategyMethodAllowNull: 'true',
  aggregationStrategyMethodName: 'append',
  completionPredicate: {
    constant: { expression: 'predicate' },
  },
  completionSize: '3',
  completionSizeExpression: {
    header: { expression: 'head', namespace: undefined },
  },
  completionTimeoutExpression: { datasonnet: { expression: 'datasonnet' }, namespace: undefined },
  correlationExpression: {
    constant: { expression: 'true', resultType: 'java.lang.Integer', namespace: undefined },
  },
};

export const circuitBreakerEntity: CircuitBreaker = {
  steps: [{ to: { uri: 'http', parameters: { httpUri: 'fooservice.com/slow' } } }],
  onFallback: { steps: [{ transform: { constant: { expression: 'Fallback message' } } }] },
};

export const filterEntity: Filter1 = {
  xpath: { expression: "/person[@name='James']" },
  steps: [{ to: { uri: 'mock', parameters: { name: 'result' } } }],
};

export const loadBalanceEntity: LoadBalance = {
  steps: [
    { to: { uri: 'seda', parameters: { name: 'x' } } },
    { to: { uri: 'seda', parameters: { name: 'y' } } },
    { to: { uri: 'seda', parameters: { name: 'z' } } },
  ],
  roundRobinLoadBalancer: {},
};

export const loopEntity: Loop = {
  steps: [{ to: { uri: 'mock', parameters: { name: 'result' } } }],
  header: { expression: 'loop' },
};

export const multicastEntity = {
  steps: [
    { to: { uri: 'direct', parameters: { name: 'b' } } },
    { to: { uri: 'direct', parameters: { name: 'c' } } },
    { to: { uri: 'direct', parameters: { name: 'd' } } },
  ],
  parallelProcessing: 'true',
  timeout: '5000',
  aggregationStrategy: '#class:com.foo.MyAggregationStrategy',
};

export const pipelineEntity: Pipeline = {
  steps: [
    { to: { uri: 'bean', parameters: { beanName: 'foo' } } },
    { to: { uri: 'bean', parameters: { beanName: 'bar' } } },
    { to: { uri: 'activemq', parameters: { destinationType: 'queue', destinationName: 'wine' } } },
  ],
};

export const resequenceEntity: Resequence = {
  steps: [{ to: { uri: 'mock', parameters: { name: 'result' } } }],
  simple: { expression: 'body' },
  batchConfig: {
    batchSize: '300',
    batchTimeout: '4000',
  },
};

export const sagaEntity: Saga = {
  compensation: 'direct:compensation',
  completion: 'direct:completion',
  option: [
    { key: 'myOptionKey', constant: { expression: 'myOptionValue', namespace: undefined } },
    { key: 'myOptionKey2', constant: { expression: 'myOptionValue2', namespace: undefined } },
  ],
  steps: [],
};

export const splitEntity: Split = {
  parallelProcessing: 'true',
  simple: { expression: 'body' },
  steps: [
    { to: { uri: 'direct', parameters: { name: 'b' } } },
    { to: { uri: 'direct', parameters: { name: 'c' } } },
    { to: { uri: 'direct', parameters: { name: 'd' } } },
  ],
};

export const choiceEntity: Choice = {
  when: [{ xpath: { expression: '/ns1:foo/' }, steps: [{ to: { uri: 'mock', parameters: { name: 'bar' } } }] }],
  otherwise: { steps: [{ to: { uri: 'mock', parameters: { name: 'other' } } }] },
};

export const doTryEntity: DoTry = {
  steps: [{ to: { uri: 'mock', parameters: { name: 'try' } } }],
  doCatch: [
    {
      exception: ['java.lang.Exception'],
      steps: [{ to: { uri: 'mock', parameters: { name: 'catch' } } }],
    },
  ],
  doFinally: {
    steps: [{ to: { uri: 'mock', parameters: { name: 'finally' } } }],
  },
};

export const deadLetterChannelEntity: ErrorHandler = {
  deadLetterChannel: {
    deadLetterUri: 'mock:dead',
    redeliveryPolicy: { maximumRedeliveries: '3', redeliveryDelay: '250' },
  },
};

export const enrichEntity: Enrich = {
  simple: { expression: 'http:myserver/${header.orderId}/order' },
};

export const dynamicRouterEntity: DynamicRouter = {
  method: { beanType: 'com.foo.MySlipBean', method: 'slip' },
};

export const recipientListEntity: RecipientList = {
  parallelProcessing: 'true',
  header: { expression: 'myHeader' },
};

export const routingSlipEntity: Exclude<RoutingSlip, string> = {
  ignoreInvalidEndpoints: 'true',
  header: { expression: 'myHeader' },
};

export const throttleEntity: Throttle = {
  timePeriodMillis: '10000',
  constant: { expression: '3' },
};

export const sampleEntity: Exclude<Sample, string> = {
  samplePeriod: '5000',
  // to is missing in the catalog currently
  // { to: { uri: 'direct:sampled' } }],
};
