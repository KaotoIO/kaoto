import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import {
  CanvasNode,
  CanvasSideBar,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  NodeIconType,
  VisibleFlowsProvider,
} from '@kaoto/kaoto/testing';
import { NodeShape } from '@patternfly/react-topology';
import { Meta, StoryFn } from '@storybook/react';

const selectedNode: CanvasNode = {
  id: 'aggregate-6839',
  label: 'aggregate',
  parentNode: undefined,
  shape: NodeShape.rect,
  type: 'node',
  data: {
    vizNode: {
      children: undefined,
      data: {
        label: 'aggregate',
        path: 'sink',
        isPlaceholder: false,
        icon: NodeIconResolver.getIcon('aggregate', NodeIconType.EIP),
      } as IVisualizationNodeData,
      id: 'aggregate-6839',
      nextNode: undefined,
      parentNode: undefined,
      previousNode: undefined,
      label: 'test',
      getId: () => 'aggregate-6839',
      getNodeTitle: () => 'Aggregate',
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          schema: {
            title: 'Aggregate',
            description: 'Aggregates many messages into a single message',
            type: 'object',
            additionalProperties: false,
            properties: {
              id: {
                type: 'string',
                title: 'Id',
                description: 'Sets the id of this node',
                $comment: 'group:common',
              },
              description: {
                type: 'string',
                title: 'Description',
                description: 'Sets the description of this node',
                $comment: 'group:common',
              },
              disabled: {
                type: 'boolean',
                title: 'Disabled',
                description:
                  'Whether to disable this EIP from the route during build time. Once an EIP has been disabled then it cannot be enabled later at runtime.',
                $comment: 'group:advanced',
              },
              correlationExpression: {
                title: 'Correlation Expression',
                description:
                  'The expression used to calculate the correlation key to use for aggregation. The Exchange which has the same correlation key is aggregated together. If the correlation key could not be evaluated an Exception is thrown. You can disable this by using the ignoreBadCorrelationKeys option.',
                $ref: '#/definitions/org.apache.camel.model.ExpressionSubElementDefinition',
                $comment: 'group:common',
                format: 'expressionProperty',
              },
              completionPredicate: {
                title: 'Completion Predicate',
                description:
                  'A Predicate to indicate when an aggregated exchange is complete. If this is not specified and the AggregationStrategy object implements Predicate, the aggregationStrategy object will be used as the completionPredicate.',
                $ref: '#/definitions/org.apache.camel.model.ExpressionSubElementDefinition',
                $comment: 'group:advanced',
                format: 'expressionProperty',
              },
              completionTimeoutExpression: {
                title: 'Completion Timeout Expression',
                description:
                  'Time in millis that an aggregated exchange should be inactive before its complete (timeout). This option can be set as either a fixed value or using an Expression which allows you to evaluate a timeout dynamically - will use Long as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0. You cannot use this option together with completionInterval, only one of the two can be used. By default the timeout checker runs every second, you can use the completionTimeoutCheckerInterval option to configure how frequently to run the checker. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                $ref: '#/definitions/org.apache.camel.model.ExpressionSubElementDefinition',
                $comment: 'group:advanced',
                format: 'expressionProperty',
              },
              completionSizeExpression: {
                title: 'Completion Size Expression',
                description:
                  'Number of messages aggregated before the aggregation is complete. This option can be set as either a fixed value or using an Expression which allows you to evaluate a size dynamically - will use Integer as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0.',
                $ref: '#/definitions/org.apache.camel.model.ExpressionSubElementDefinition',
                $comment: 'group:advanced',
                format: 'expressionProperty',
              },
              optimisticLockRetryPolicy: {
                title: 'Optimistic Lock Retry Policy',
                description: 'Allows to configure retry settings when using optimistic locking.',
                $ref: '#/definitions/org.apache.camel.model.OptimisticLockRetryPolicyDefinition',
                $comment: 'group:advanced',
              },
              parallelProcessing: {
                type: 'boolean',
                title: 'Parallel Processing',
                description:
                  'When aggregated are completed they are being send out of the aggregator. This option indicates whether or not Camel should use a thread pool with multiple threads for concurrency. If no custom thread pool has been specified then Camel creates a default pool with 10 concurrent threads.',
                $comment: 'group:common',
              },
              optimisticLocking: {
                type: 'boolean',
                title: 'Optimistic Locking',
                description:
                  'Turns on using optimistic locking, which requires the aggregationRepository being used, is supporting this by implementing org.apache.camel.spi.OptimisticLockingAggregationRepository .',
                $comment: 'group:common',
              },
              executorService: {
                type: 'string',
                title: 'Executor Service',
                description:
                  'If using parallelProcessing you can specify a custom thread pool to be used. In fact also if you are not using parallelProcessing this custom thread pool is used to send out aggregated exchanges as well.',
                $comment: 'group:advanced',
                format: 'bean:java.util.concurrent.ExecutorService',
              },
              timeoutCheckerExecutorService: {
                type: 'string',
                title: 'Timeout Checker Executor Service',
                description:
                  'If using either of the completionTimeout, completionTimeoutExpression, or completionInterval options a background thread is created to check for the completion for every aggregator. Set this option to provide a custom thread pool to be used rather than creating a new thread for every aggregator.',
                $comment: 'group:advanced',
                format: 'bean:java.util.concurrent.ScheduledExecutorService',
              },
              aggregateController: {
                type: 'string',
                title: 'Aggregate Controller',
                description:
                  'To use a org.apache.camel.processor.aggregate.AggregateController to allow external sources to control this aggregator.',
                $comment: 'group:advanced',
                format: 'bean:org.apache.camel.processor.aggregate.AggregateController',
              },
              aggregationRepository: {
                type: 'string',
                title: 'Aggregation Repository',
                description:
                  'The AggregationRepository to use. Sets the custom aggregate repository to use. Will by default use org.apache.camel.processor.aggregate.MemoryAggregationRepository',
                $comment: 'group:common',
                format: 'bean:org.apache.camel.spi.AggregationRepository',
              },
              aggregationStrategy: {
                type: 'string',
                title: 'Aggregation Strategy',
                description:
                  'The AggregationStrategy to use. For example to lookup a bean with the name foo, the value is simply just #bean:foo. Configuring an AggregationStrategy is required, and is used to merge the incoming Exchange with the existing already merged exchanges. At first call the oldExchange parameter is null. On subsequent invocations the oldExchange contains the merged exchanges and newExchange is of course the new incoming Exchange.',
                $comment: 'group:common',
                format: 'bean:org.apache.camel.AggregationStrategy',
              },
              aggregationStrategyMethodName: {
                type: 'string',
                title: 'Aggregation Strategy Method Name',
                description:
                  'This option can be used to explicit declare the method name to use, when using beans as the AggregationStrategy.',
                $comment: 'group:advanced',
              },
              aggregationStrategyMethodAllowNull: {
                type: 'boolean',
                title: 'Aggregation Strategy Method Allow Null',
                description:
                  'If this option is false then the aggregate method is not used for the very first aggregation. If this option is true then null values is used as the oldExchange (at the very first aggregation), when using beans as the AggregationStrategy.',
                $comment: 'group:advanced',
              },
              completionSize: {
                type: 'number',
                title: 'Completion Size',
                description:
                  'Number of messages aggregated before the aggregation is complete. This option can be set as either a fixed value or using an Expression which allows you to evaluate a size dynamically - will use Integer as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0.',
                $comment: 'group:common',
              },
              completionInterval: {
                type: 'string',
                title: 'Completion Interval',
                description:
                  'A repeating period in millis by which the aggregator will complete all current aggregated exchanges. Camel has a background task which is triggered every period. You cannot use this option together with completionTimeout, only one of them can be used.',
                $comment: 'group:common',
                format: 'duration',
              },
              completionTimeout: {
                type: 'string',
                title: 'Completion Timeout',
                description:
                  'Time in millis that an aggregated exchange should be inactive before its complete (timeout). This option can be set as either a fixed value or using an Expression which allows you to evaluate a timeout dynamically - will use Long as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0. You cannot use this option together with completionInterval, only one of the two can be used. By default the timeout checker runs every second, you can use the completionTimeoutCheckerInterval option to configure how frequently to run the checker. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                $comment: 'group:common',
                format: 'duration',
              },
              completionTimeoutCheckerInterval: {
                type: 'string',
                title: 'Completion Timeout Checker Interval',
                description:
                  'Interval in millis that is used by the background task that checks for timeouts ( org.apache.camel.TimeoutMap ). By default the timeout checker runs every second. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                default: '1000',
                $comment: 'group:advanced',
                format: 'duration',
              },
              completionFromBatchConsumer: {
                type: 'boolean',
                title: 'Completion From Batch Consumer',
                description:
                  'Enables the batch completion mode where we aggregate from a org.apache.camel.BatchConsumer and aggregate the total number of exchanges the org.apache.camel.BatchConsumer has reported as total by checking the exchange property org.apache.camel.Exchange#BATCH_COMPLETE when its complete. This option cannot be used together with discardOnAggregationFailure.',
                $comment: 'group:advanced',
              },
              completionOnNewCorrelationGroup: {
                type: 'boolean',
                title: 'Completion On New Correlation Group',
                description:
                  'Enables completion on all previous groups when a new incoming correlation group. This can for example be used to complete groups with same correlation keys when they are in consecutive order. Notice when this is enabled then only 1 correlation group can be in progress as when a new correlation group starts, then the previous groups is forced completed.',
                $comment: 'group:advanced',
              },
              eagerCheckCompletion: {
                type: 'boolean',
                title: 'Eager Check Completion',
                description:
                  'Use eager completion checking which means that the completionPredicate will use the incoming Exchange. As opposed to without eager completion checking the completionPredicate will use the aggregated Exchange.',
                $comment: 'group:common',
              },
              ignoreInvalidCorrelationKeys: {
                type: 'boolean',
                title: 'Ignore Invalid Correlation Keys',
                description:
                  'If a correlation key cannot be successfully evaluated it will be ignored by logging a DEBUG and then just ignore the incoming Exchange.',
                $comment: 'group:advanced',
              },
              closeCorrelationKeyOnCompletion: {
                type: 'number',
                title: 'Close Correlation Key On Completion',
                description:
                  'Closes a correlation key when its complete. Any late received exchanges which has a correlation key that has been closed, it will be defined and a ClosedCorrelationKeyException is thrown.',
                $comment: 'group:advanced',
              },
              discardOnCompletionTimeout: {
                type: 'boolean',
                title: 'Discard On Completion Timeout',
                description:
                  'Discards the aggregated message on completion timeout. This means on timeout the aggregated message is dropped and not sent out of the aggregator.',
                $comment: 'group:advanced',
              },
              discardOnAggregationFailure: {
                type: 'boolean',
                title: 'Discard On Aggregation Failure',
                description:
                  'Discards the aggregated message when aggregation failed (an exception was thrown from AggregationStrategy . This means the partly aggregated message is dropped and not sent out of the aggregator. This option cannot be used together with completionFromBatchConsumer.',
                $comment: 'group:advanced',
              },
              forceCompletionOnStop: {
                type: 'boolean',
                title: 'Force Completion On Stop',
                description: 'Indicates to complete all current aggregated exchanges when the context is stopped',
                $comment: 'group:advanced',
              },
              completeAllOnStop: {
                type: 'boolean',
                title: 'Complete All On Stop',
                description:
                  'Indicates to wait to complete all current and partial (pending) aggregated exchanges when the context is stopped. This also means that we will wait for all pending exchanges which are stored in the aggregation repository to complete so the repository is empty before we can stop. You may want to enable this when using the memory based aggregation repository that is memory based only, and do not store data on disk. When this option is enabled, then the aggregator is waiting to complete all those exchanges before its stopped, when stopping CamelContext or the route using it.',
                $comment: 'group:advanced',
              },
            },
            required: ['aggregationStrategy', 'correlationExpression'],
            definitions: {
              'org.apache.camel.model.ExpressionSubElementDefinition': {
                type: 'object',
                additionalProperties: false,
                anyOf: [
                  {
                    oneOf: [
                      {
                        type: 'object',
                        required: ['constant'],
                        properties: {
                          constant: {
                            $ref: '#/definitions/org.apache.camel.model.language.ConstantExpression',
                          },
                        },
                      },
                      {
                        not: {
                          anyOf: [
                            {
                              required: ['constant'],
                            },
                            {
                              required: ['csimple'],
                            },
                            {
                              required: ['datasonnet'],
                            },
                            {
                              required: ['exchangeProperty'],
                            },
                            {
                              required: ['groovy'],
                            },
                            {
                              required: ['header'],
                            },
                            {
                              required: ['hl7terser'],
                            },
                            {
                              required: ['java'],
                            },
                            {
                              required: ['joor'],
                            },
                            {
                              required: ['jq'],
                            },
                            {
                              required: ['js'],
                            },
                            {
                              required: ['jsonpath'],
                            },
                            {
                              required: ['language'],
                            },
                            {
                              required: ['method'],
                            },
                            {
                              required: ['mvel'],
                            },
                            {
                              required: ['ognl'],
                            },
                            {
                              required: ['python'],
                            },
                            {
                              required: ['ref'],
                            },
                            {
                              required: ['simple'],
                            },
                            {
                              required: ['spel'],
                            },
                            {
                              required: ['tokenize'],
                            },
                            {
                              required: ['variable'],
                            },
                            {
                              required: ['wasm'],
                            },
                            {
                              required: ['xpath'],
                            },
                            {
                              required: ['xquery'],
                            },
                            {
                              required: ['xtokenize'],
                            },
                          ],
                        },
                      },
                      {
                        type: 'object',
                        required: ['csimple'],
                        properties: {
                          csimple: {
                            $ref: '#/definitions/org.apache.camel.model.language.CSimpleExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['datasonnet'],
                        properties: {
                          datasonnet: {
                            $ref: '#/definitions/org.apache.camel.model.language.DatasonnetExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['exchangeProperty'],
                        properties: {
                          exchangeProperty: {
                            $ref: '#/definitions/org.apache.camel.model.language.ExchangePropertyExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['groovy'],
                        properties: {
                          groovy: {
                            $ref: '#/definitions/org.apache.camel.model.language.GroovyExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['header'],
                        properties: {
                          header: {
                            $ref: '#/definitions/org.apache.camel.model.language.HeaderExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['hl7terser'],
                        properties: {
                          hl7terser: {
                            $ref: '#/definitions/org.apache.camel.model.language.Hl7TerserExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['java'],
                        properties: {
                          java: {
                            $ref: '#/definitions/org.apache.camel.model.language.JavaExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['joor'],
                        properties: {
                          joor: {
                            $ref: '#/definitions/org.apache.camel.model.language.JoorExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['jq'],
                        properties: {
                          jq: {
                            $ref: '#/definitions/org.apache.camel.model.language.JqExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['js'],
                        properties: {
                          js: {
                            $ref: '#/definitions/org.apache.camel.model.language.JavaScriptExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['jsonpath'],
                        properties: {
                          jsonpath: {
                            $ref: '#/definitions/org.apache.camel.model.language.JsonPathExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['language'],
                        properties: {
                          language: {
                            $ref: '#/definitions/org.apache.camel.model.language.LanguageExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['method'],
                        properties: {
                          method: {
                            $ref: '#/definitions/org.apache.camel.model.language.MethodCallExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['mvel'],
                        properties: {
                          mvel: {
                            $ref: '#/definitions/org.apache.camel.model.language.MvelExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['ognl'],
                        properties: {
                          ognl: {
                            $ref: '#/definitions/org.apache.camel.model.language.OgnlExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['python'],
                        properties: {
                          python: {
                            $ref: '#/definitions/org.apache.camel.model.language.PythonExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['ref'],
                        properties: {
                          ref: {
                            $ref: '#/definitions/org.apache.camel.model.language.RefExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['simple'],
                        properties: {
                          simple: {
                            $ref: '#/definitions/org.apache.camel.model.language.SimpleExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['spel'],
                        properties: {
                          spel: {
                            $ref: '#/definitions/org.apache.camel.model.language.SpELExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['tokenize'],
                        properties: {
                          tokenize: {
                            $ref: '#/definitions/org.apache.camel.model.language.TokenizerExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['variable'],
                        properties: {
                          variable: {
                            $ref: '#/definitions/org.apache.camel.model.language.VariableExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['wasm'],
                        properties: {
                          wasm: {
                            $ref: '#/definitions/org.apache.camel.model.language.WasmExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['xpath'],
                        properties: {
                          xpath: {
                            $ref: '#/definitions/org.apache.camel.model.language.XPathExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['xquery'],
                        properties: {
                          xquery: {
                            $ref: '#/definitions/org.apache.camel.model.language.XQueryExpression',
                          },
                        },
                      },
                      {
                        type: 'object',
                        required: ['xtokenize'],
                        properties: {
                          xtokenize: {
                            $ref: '#/definitions/org.apache.camel.model.language.XMLTokenizerExpression',
                          },
                        },
                      },
                    ],
                  },
                ],
                properties: {
                  constant: {},
                  csimple: {},
                  datasonnet: {},
                  exchangeProperty: {},
                  groovy: {},
                  header: {},
                  hl7terser: {},
                  java: {},
                  joor: {},
                  jq: {},
                  js: {},
                  jsonpath: {},
                  language: {},
                  method: {},
                  mvel: {},
                  ognl: {},
                  python: {},
                  ref: {},
                  simple: {},
                  spel: {},
                  tokenize: {},
                  variable: {},
                  wasm: {},
                  xpath: {},
                  xquery: {},
                  xtokenize: {},
                },
              },
              'org.apache.camel.model.language.ConstantExpression': {
                title: 'Constant',
                description: 'A fixed value set only once during the route startup.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.CSimpleExpression': {
                title: 'CSimple',
                description: 'Evaluate a compiled simple expression.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.DatasonnetExpression': {
                title: 'DataSonnet',
                description: 'To use DataSonnet scripts for message transformations.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  bodyMediaType: {
                    type: 'string',
                    title: 'Body Media Type',
                    description: "The String representation of the message's body MediaType",
                    $comment: 'group:common',
                  },
                  outputMediaType: {
                    type: 'string',
                    title: 'Output Media Type',
                    description: 'The String representation of the MediaType to output',
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.ExchangePropertyExpression': {
                title: 'ExchangeProperty',
                description: 'Gets a property from the Exchange.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.GroovyExpression': {
                title: 'Groovy',
                description: 'Evaluates a Groovy script.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.HeaderExpression': {
                title: 'Header',
                description: 'Gets a header from the Exchange.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.Hl7TerserExpression': {
                title: 'HL7 Terser',
                description: 'Get the value of a HL7 message field specified by terse location specification syntax.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.JavaExpression': {
                title: 'Java',
                description: 'Evaluates a Java (Java compiled once at runtime) expression.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  preCompile: {
                    type: 'boolean',
                    title: 'Pre Compile',
                    description:
                      'Whether the expression should be pre compiled once during initialization phase. If this is turned off, then the expression is reloaded and compiled on each evaluation.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  singleQuotes: {
                    type: 'boolean',
                    title: 'Single Quotes',
                    description:
                      'Whether single quotes can be used as replacement for double quotes. This is convenient when you need to work with strings inside strings.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.JoorExpression': {
                title: 'jOOR',
                description: 'Evaluates a jOOR (Java compiled once at runtime) expression.',
                deprecated: true,
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  preCompile: {
                    type: 'boolean',
                    title: 'Pre Compile',
                    description:
                      'Whether the expression should be pre compiled once during initialization phase. If this is turned off, then the expression is reloaded and compiled on each evaluation.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  singleQuotes: {
                    type: 'boolean',
                    title: 'Single Quotes',
                    description:
                      'Whether single quotes can be used as replacement for double quotes. This is convenient when you need to work with strings inside strings.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.JqExpression': {
                title: 'JQ',
                description: 'Evaluates a JQ expression against a JSON message body.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.JavaScriptExpression': {
                title: 'JavaScript',
                description: 'Evaluates a JavaScript expression.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.JsonPathExpression': {
                title: 'JSONPath',
                description: 'Evaluates a JSONPath expression against a JSON message body.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  suppressExceptions: {
                    type: 'boolean',
                    title: 'Suppress Exceptions',
                    description: 'Whether to suppress exceptions such as PathNotFoundException.',
                    $comment: 'group:common',
                  },
                  allowSimple: {
                    type: 'boolean',
                    title: 'Allow Simple',
                    description: 'Whether to allow in inlined Simple exceptions in the JSONPath expression',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  allowEasyPredicate: {
                    type: 'boolean',
                    title: 'Allow Easy Predicate',
                    description: 'Whether to allow using the easy predicate parser to pre-parse predicates.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  writeAsString: {
                    type: 'boolean',
                    title: 'Write As String',
                    description:
                      'Whether to write the output of each row/element as a JSON String value instead of a Map/POJO value.',
                    $comment: 'group:common',
                  },
                  unpackArray: {
                    type: 'boolean',
                    title: 'Unpack Array',
                    description: 'Whether to unpack a single element json-array into an object.',
                    $comment: 'group:common',
                  },
                  option: {
                    type: 'string',
                    title: 'Option',
                    description:
                      'To configure additional options on JSONPath. Multiple values can be separated by comma.',
                    enum: [
                      'DEFAULT_PATH_LEAF_TO_NULL',
                      'ALWAYS_RETURN_LIST',
                      'AS_PATH_LIST',
                      'SUPPRESS_EXCEPTIONS',
                      'REQUIRE_PROPERTIES',
                    ],
                    $comment: 'group:advanced',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.LanguageExpression': {
                title: 'Language',
                description: 'Evaluates a custom language.',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  language: {
                    type: 'string',
                    title: 'Language',
                    description: 'The name of the language to use',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
                required: ['expression', 'language'],
              },
              'org.apache.camel.model.language.MethodCallExpression': {
                title: 'Bean Method',
                description: 'Calls a Java bean method.',
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  ref: {
                    type: 'string',
                    title: 'Ref',
                    description: 'Reference to an existing bean (bean id) to lookup in the registry',
                    $comment: 'group:common',
                  },
                  method: {
                    type: 'string',
                    title: 'Method',
                    description: 'Name of method to call',
                    $comment: 'group:common',
                  },
                  beanType: {
                    type: 'string',
                    title: 'Bean Type',
                    description:
                      'Class name (fully qualified) of the bean to use Will lookup in registry and if there is a single instance of the same type, then the existing bean is used, otherwise a new bean is created (requires a default no-arg constructor).',
                    $comment: 'group:common',
                  },
                  scope: {
                    type: 'string',
                    title: 'Scope',
                    description:
                      'Scope of bean. When using singleton scope (default) the bean is created or looked up only once and reused for the lifetime of the endpoint. The bean should be thread-safe in case concurrent threads is calling the bean at the same time. When using request scope the bean is created or looked up once per request (exchange). This can be used if you want to store state on a bean while processing a request and you want to call the same bean instance multiple times while processing the request. The bean does not have to be thread-safe as the instance is only called from the same request. When using prototype scope, then the bean will be looked up or created per call. However in case of lookup then this is delegated to the bean registry such as Spring or CDI (if in use), which depends on their configuration can act as either singleton or prototype scope. So when using prototype scope then this depends on the bean registry implementation.',
                    default: 'Singleton',
                    enum: ['Singleton', 'Request', 'Prototype'],
                    $comment: 'group:advanced',
                  },
                  validate: {
                    type: 'boolean',
                    title: 'Validate',
                    description: 'Whether to validate the bean has the configured method.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.MvelExpression': {
                title: 'MVEL',
                description: 'Evaluates a MVEL template.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.OgnlExpression': {
                title: 'OGNL',
                description: 'Evaluates an OGNL expression (Apache Commons OGNL).',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.PythonExpression': {
                title: 'Python',
                description: 'Evaluates a Python expression.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.RefExpression': {
                title: 'Ref',
                description: 'Uses an existing expression from the registry.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.SimpleExpression': {
                title: 'Simple',
                description: 'Evaluates a Camel simple expression.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.SpELExpression': {
                title: 'SpEL',
                description: 'Evaluates a Spring expression (SpEL).',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.TokenizerExpression': {
                title: 'Tokenize',
                description: 'Tokenize text payloads using delimiter patterns.',
                required: ['token'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  token: {
                    type: 'string',
                    title: 'Token',
                    description:
                      'The (start) token to use as tokenizer, for example you can use the new line token. You can use simple language as the token to support dynamic tokens.',
                    $comment: 'group:common',
                  },
                  endToken: {
                    type: 'string',
                    title: 'End Token',
                    description:
                      'The end token to use as tokenizer if using start/end token pairs. You can use simple language as the token to support dynamic tokens.',
                    $comment: 'group:common',
                  },
                  inheritNamespaceTagName: {
                    type: 'string',
                    title: 'Inherit Namespace Tag Name',
                    description:
                      'To inherit namespaces from a root/parent tag name when using XML You can use simple language as the tag name to support dynamic names.',
                    $comment: 'group:advanced',
                  },
                  regex: {
                    type: 'boolean',
                    title: 'Regex',
                    description: 'If the token is a regular expression pattern. The default value is false',
                    $comment: 'group:advanced',
                  },
                  xml: {
                    type: 'boolean',
                    title: 'Xml',
                    description:
                      'Whether the input is XML messages. This option must be set to true if working with XML payloads.',
                    $comment: 'group:common',
                  },
                  includeTokens: {
                    type: 'boolean',
                    title: 'Include Tokens',
                    description:
                      'Whether to include the tokens in the parts when using pairs. When including tokens then the endToken property must also be configured (to use pair mode). The default value is false',
                    $comment: 'group:common',
                  },
                  group: {
                    type: 'string',
                    title: 'Group',
                    description:
                      'To group N parts together, for example to split big files into chunks of 1000 lines. You can use simple language as the group to support dynamic group sizes.',
                    $comment: 'group:advanced',
                  },
                  groupDelimiter: {
                    type: 'string',
                    title: 'Group Delimiter',
                    description:
                      'Sets the delimiter to use when grouping. If this has not been set then token will be used as the delimiter.',
                    $comment: 'group:advanced',
                  },
                  skipFirst: {
                    type: 'boolean',
                    title: 'Skip First',
                    description: 'To skip the very first element',
                    $comment: 'group:advanced',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.VariableExpression': {
                title: 'Variable',
                description: 'Gets a variable',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.WasmExpression': {
                title: 'Wasm',
                description: 'Call a wasm (web assembly) function.',
                required: ['expression', 'module'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  module: {
                    type: 'string',
                    title: 'Module',
                    description:
                      'Set the module (the distributable, loadable, and executable unit of code in WebAssembly) resource that provides the expression function.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.XPathExpression': {
                title: 'XPath',
                description: 'Evaluates an XPath expression against an XML payload.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  documentType: {
                    type: 'string',
                    title: 'Document Type',
                    description: 'Name of class for document type The default value is org.w3c.dom.Document',
                    $comment: 'group:advanced',
                  },
                  resultQName: {
                    type: 'string',
                    title: 'Result QName',
                    description: 'Sets the output type supported by XPath.',
                    default: 'NODESET',
                    enum: ['NUMBER', 'STRING', 'BOOLEAN', 'NODESET', 'NODE'],
                    $comment: 'group:common',
                  },
                  saxon: {
                    type: 'boolean',
                    title: 'Saxon',
                    description: 'Whether to use Saxon.',
                    $comment: 'group:advanced',
                  },
                  factoryRef: {
                    type: 'string',
                    title: 'Factory Ref',
                    description: 'References to a custom XPathFactory to lookup in the registry',
                    $comment: 'group:advanced',
                  },
                  objectModel: {
                    type: 'string',
                    title: 'Object Model',
                    description: 'The XPath object model to use',
                    $comment: 'group:advanced',
                  },
                  logNamespaces: {
                    type: 'boolean',
                    title: 'Log Namespaces',
                    description: 'Whether to log namespaces which can assist during troubleshooting',
                    $comment: 'group:advanced',
                  },
                  threadSafety: {
                    type: 'boolean',
                    title: 'Thread Safety',
                    description:
                      'Whether to enable thread-safety for the returned result of the xpath expression. This applies to when using NODESET as the result type, and the returned set has multiple elements. In this situation there can be thread-safety issues if you process the NODESET concurrently such as from a Camel Splitter EIP in parallel processing mode. This option prevents concurrency issues by doing defensive copies of the nodes. It is recommended to turn this option on if you are using camel-saxon or Saxon in your application. Saxon has thread-safety issues which can be prevented by turning this option on.',
                    $comment: 'group:advanced',
                  },
                  preCompile: {
                    type: 'boolean',
                    title: 'Pre Compile',
                    description:
                      'Whether to enable pre-compiling the xpath expression during initialization phase. pre-compile is enabled by default. This can be used to turn off, for example in cases the compilation phase is desired at the starting phase, such as if the application is ahead of time compiled (for example with camel-quarkus) which would then load the xpath factory of the built operating system, and not a JVM runtime.',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  namespace: {
                    type: 'array',
                    title: 'Namespace',
                    description: 'Injects the XML Namespaces of prefix - uri mappings',
                    items: {
                      $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
                    },
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.PropertyDefinition': {
                title: 'Property',
                description: 'A key value pair where the value is a literal value',
                type: 'object',
                additionalProperties: false,
                properties: {
                  key: {
                    type: 'string',
                    title: 'Key',
                    description: 'The name of the property',
                    $comment: 'group:common',
                  },
                  value: {
                    type: 'string',
                    title: 'Value',
                    description: 'The property value.',
                    $comment: 'group:common',
                  },
                },
                required: ['key', 'value'],
              },
              'org.apache.camel.model.language.XQueryExpression': {
                title: 'XQuery',
                description: 'Evaluates an XQuery expressions against an XML payload.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  configurationRef: {
                    type: 'string',
                    title: 'Configuration Ref',
                    description:
                      'Reference to a saxon configuration instance in the registry to use for xquery (requires camel-saxon). This may be needed to add custom functions to a saxon configuration, so these custom functions can be used in xquery expressions.',
                    $comment: 'group:advanced',
                  },
                  namespace: {
                    type: 'array',
                    title: 'Namespace',
                    description: 'Injects the XML Namespaces of prefix - uri mappings',
                    items: {
                      $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
                    },
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.language.XMLTokenizerExpression': {
                title: 'XML Tokenize',
                description: 'Tokenize XML payloads.',
                required: ['expression'],
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: {
                    type: 'string',
                    title: 'Id',
                    description: 'Sets the id of this node',
                    $comment: 'group:common',
                  },
                  expression: {
                    type: 'string',
                    title: 'Expression',
                    description: 'The expression value in your chosen language syntax',
                    $comment: 'group:common',
                  },
                  mode: {
                    type: 'string',
                    title: 'Mode',
                    description:
                      'The extraction mode. The available extraction modes are: i - injecting the contextual namespace bindings into the extracted token (default) w - wrapping the extracted token in its ancestor context u - unwrapping the extracted token to its child content t - extracting the text content of the specified element',
                    default: 'i',
                    enum: ['i', 'w', 'u', 't'],
                    $comment: 'group:common',
                  },
                  group: {
                    type: 'number',
                    title: 'Group',
                    description: 'To group N parts together',
                    $comment: 'group:common',
                  },
                  namespace: {
                    type: 'array',
                    title: 'Namespace',
                    description: 'Injects the XML Namespaces of prefix - uri mappings',
                    items: {
                      $ref: '#/definitions/org.apache.camel.model.PropertyDefinition',
                    },
                    $comment: 'group:common',
                  },
                  source: {
                    type: 'string',
                    title: 'Source',
                    description:
                      'Source to use, instead of message body. You can prefix with variable:, header:, or property: to specify kind of source. Otherwise, the source is assumed to be a variable. Use empty or null to use default source, which is the message body.',
                    $comment: 'group:common',
                  },
                  resultType: {
                    type: 'string',
                    title: 'Result Type',
                    description: 'Sets the class of the result type (type from output)',
                    $comment: 'group:common',
                  },
                  trim: {
                    type: 'boolean',
                    title: 'Trim',
                    description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
                    $comment: 'group:advanced',
                    default: true,
                  },
                },
              },
              'org.apache.camel.model.OptimisticLockRetryPolicyDefinition': {
                title: 'Optimistic Lock Retry Policy',
                description: 'To configure optimistic locking',
                type: 'object',
                additionalProperties: false,
                properties: {
                  maximumRetries: {
                    type: 'number',
                    title: 'Maximum Retries',
                    description: 'Sets the maximum number of retries',
                    $comment: 'group:common',
                  },
                  retryDelay: {
                    type: 'string',
                    title: 'Retry Delay',
                    description: 'Sets the delay in millis between retries',
                    default: '50',
                    $comment: 'group:common',
                    format: 'duration',
                  },
                  maximumRetryDelay: {
                    type: 'string',
                    title: 'Maximum Retry Delay',
                    description:
                      'Sets the upper value of retry in millis between retries, when using exponential or random backoff',
                    default: '1000',
                    $comment: 'group:common',
                    format: 'duration',
                  },
                  exponentialBackOff: {
                    type: 'boolean',
                    title: 'Exponential Back Off',
                    description: 'Enable exponential backoff',
                    $comment: 'group:advanced',
                    default: true,
                  },
                  randomBackOff: {
                    type: 'boolean',
                    title: 'Random Back Off',
                    description: 'Enables random backoff',
                    $comment: 'group:advanced',
                  },
                },
              },
            },
            $schema: 'http://json-schema.org/draft-07/schema#',
          },
        };
      },
      updateModel: () => {},
      getBaseEntity: () => {},
    } as unknown as IVisualizationNode,
  },
};

export default {
  title: 'Canvas/Aggregate',
  component: CanvasSideBar,
  decorators: [
    (Story: StoryFn) => (
      <SuggestionRegistryProvider>
        <Story />
      </SuggestionRegistryProvider>
    ),
  ],
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  return (
    <CanvasFormTabsContext.Provider
      value={{
        selectedTab: 'All',
        setSelectedTab: () => {},
      }}
    >
      <VisibleFlowsProvider>
        <CanvasSideBar {...args} onClose={() => {}} />
      </VisibleFlowsProvider>
    </CanvasFormTabsContext.Provider>
  );
};

export const AggregateNode = Template.bind({});
AggregateNode.args = {
  selectedNode,
};
