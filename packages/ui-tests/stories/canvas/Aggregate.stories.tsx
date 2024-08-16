import {
  CanvasNode,
  CanvasSideBar,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  NodeIconType,
  VisibleFlowsProvider,
  VisualComponentSchema,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';

const selectedNode: CanvasNode = {
  id: 'aggregate-6839',
  label: 'aggregate',
  parentNode: undefined,
  shape: 'rect',
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
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          title: 'aggregate',
          schema: {
            title: 'Aggregate',
            description: 'Aggregates many messages into a single message',
            type: 'object',
            properties: {
              id: {
                type: 'string',
                title: 'Id',
                description: 'Sets the id of this node',
                group: 'common',
              },
              description: {
                type: 'string',
                title: 'description',
                description: 'Sets the description of this node',
                group: 'common',
              },
              disabled: {
                type: 'boolean',
                title: 'Disabled',
                description:
                  'Whether to disable this EIP from the route during build time. Once an EIP has been disabled then it cannot be enabled later at runtime.',
                group: 'advanced',
              },
              correlationExpression: {
                title: 'Correlation Expression',
                description:
                  'The expression used to calculate the correlation key to use for aggregation. The Exchange which has the same correlation key is aggregated together. If the correlation key could not be evaluated an Exception is thrown. You can disable this by using the ignoreBadCorrelationKeys option.',
                type: 'object',
                $comment: 'expression',
                group: 'common',
              },
              completionPredicate: {
                title: 'Completion Predicate',
                description:
                  'A Predicate to indicate when an aggregated exchange is complete. If this is not specified and the AggregationStrategy object implements Predicate, the aggregationStrategy object will be used as the completionPredicate.',
                type: 'object',
                $comment: 'expression',
                group: 'advanced',
              },
              completionTimeoutExpression: {
                title: 'Completion Timeout Expression',
                description:
                  'Time in millis that an aggregated exchange should be inactive before its complete (timeout). This option can be set as either a fixed value or using an Expression which allows you to evaluate a timeout dynamically - will use Long as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0. You cannot use this option together with completionInterval, only one of the two can be used. By default the timeout checker runs every second, you can use the completionTimeoutCheckerInterval option to configure how frequently to run the checker. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                type: 'object',
                $comment: 'expression',
                group: 'advanced',
              },
              completionSizeExpression: {
                title: 'Completion Size Expression',
                description:
                  'Number of messages aggregated before the aggregation is complete. This option can be set as either a fixed value or using an Expression which allows you to evaluate a size dynamically - will use Integer as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0.',
                type: 'object',
                $comment: 'expression',
                group: 'advanced',
              },
              parallelProcessing: {
                type: 'boolean',
                title: 'Parallel Processing',
                description:
                  'When aggregated are completed they are being send out of the aggregator. This option indicates whether or not Camel should use a thread pool with multiple threads for concurrency. If no custom thread pool has been specified then Camel creates a default pool with 10 concurrent threads.',
                group: 'common',
              },
              optimisticLocking: {
                type: 'boolean',
                title: 'Optimistic Locking',
                description:
                  'Turns on using optimistic locking, which requires the aggregationRepository being used, is supporting this by implementing org.apache.camel.spi.OptimisticLockingAggregationRepository .',
                group: 'common',
              },
              executorService: {
                type: 'string',
                title: 'Executor Service',
                description:
                  'If using parallelProcessing you can specify a custom thread pool to be used. In fact also if you are not using parallelProcessing this custom thread pool is used to send out aggregated exchanges as well.',
                $comment: 'class:java.util.concurrent.ExecutorService',
                group: 'advanced',
              },
              timeoutCheckerExecutorService: {
                type: 'string',
                title: 'Timeout Checker Executor Service',
                description:
                  'If using either of the completionTimeout, completionTimeoutExpression, or completionInterval options a background thread is created to check for the completion for every aggregator. Set this option to provide a custom thread pool to be used rather than creating a new thread for every aggregator.',
                $comment: 'class:java.util.concurrent.ScheduledExecutorService',
                group: 'advanced',
              },
              aggregateController: {
                type: 'string',
                title: 'Aggregate Controller',
                description:
                  'To use a org.apache.camel.processor.aggregate.AggregateController to allow external sources to control this aggregator.',
                $comment: 'class:org.apache.camel.processor.aggregate.AggregateController',
                group: 'advanced',
              },
              aggregationRepository: {
                type: 'string',
                title: 'Aggregation Repository',
                description:
                  'The AggregationRepository to use. Sets the custom aggregate repository to use. Will by default use org.apache.camel.processor.aggregate.MemoryAggregationRepository',
                $comment: 'class:org.apache.camel.spi.AggregationRepository',
                group: 'common',
              },
              aggregationStrategy: {
                type: 'string',
                title: 'Aggregation Strategy',
                description:
                  'The AggregationStrategy to use. For example to lookup a bean with the name foo, the value is simply just #bean:foo. Configuring an AggregationStrategy is required, and is used to merge the incoming Exchange with the existing already merged exchanges. At first call the oldExchange parameter is null. On subsequent invocations the oldExchange contains the merged exchanges and newExchange is of course the new incoming Exchange.',
                $comment: 'class:org.apache.camel.AggregationStrategy',
                group: 'common',
              },
              aggregationStrategyMethodName: {
                type: 'string',
                title: 'Aggregation Strategy Method Name',
                description:
                  'This option can be used to explicit declare the method name to use, when using beans as the AggregationStrategy.',
                group: 'advanced',
              },
              aggregationStrategyMethodAllowNull: {
                type: 'boolean',
                title: 'Aggregation Strategy Method Allow Null',
                description:
                  'If this option is false then the aggregate method is not used for the very first aggregation. If this option is true then null values is used as the oldExchange (at the very first aggregation), when using beans as the AggregationStrategy.',
                group: 'advanced',
              },
              completionSize: {
                type: 'number',
                title: 'Completion Size',
                description:
                  'Number of messages aggregated before the aggregation is complete. This option can be set as either a fixed value or using an Expression which allows you to evaluate a size dynamically - will use Integer as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0.',
                group: 'common',
              },
              completionInterval: {
                type: 'string',
                title: 'Completion Interval',
                description:
                  'A repeating period in millis by which the aggregator will complete all current aggregated exchanges. Camel has a background task which is triggered every period. You cannot use this option together with completionTimeout, only one of them can be used.',
                group: 'common',
              },
              completionTimeout: {
                type: 'string',
                title: 'Completion Timeout',
                description:
                  'Time in millis that an aggregated exchange should be inactive before its complete (timeout). This option can be set as either a fixed value or using an Expression which allows you to evaluate a timeout dynamically - will use Long as result. If both are set Camel will fallback to use the fixed value if the Expression result was null or 0. You cannot use this option together with completionInterval, only one of the two can be used. By default the timeout checker runs every second, you can use the completionTimeoutCheckerInterval option to configure how frequently to run the checker. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                group: 'common',
              },
              completionTimeoutCheckerInterval: {
                type: 'string',
                title: 'Completion Timeout Checker Interval',
                description:
                  'Interval in millis that is used by the background task that checks for timeouts ( org.apache.camel.TimeoutMap ). By default the timeout checker runs every second. The timeout is an approximation and there is no guarantee that the a timeout is triggered exactly after the timeout value. It is not recommended to use very low timeout values or checker intervals.',
                default: '1000',
                group: 'advanced',
              },
              completionFromBatchConsumer: {
                type: 'boolean',
                title: 'Completion From Batch Consumer',
                description:
                  'Enables the batch completion mode where we aggregate from a org.apache.camel.BatchConsumer and aggregate the total number of exchanges the org.apache.camel.BatchConsumer has reported as total by checking the exchange property org.apache.camel.Exchange#BATCH_COMPLETE when its complete. This option cannot be used together with discardOnAggregationFailure.',
                group: 'advanced',
              },
              completionOnNewCorrelationGroup: {
                type: 'boolean',
                title: 'Completion On New Correlation Group',
                description:
                  'Enables completion on all previous groups when a new incoming correlation group. This can for example be used to complete groups with same correlation keys when they are in consecutive order. Notice when this is enabled then only 1 correlation group can be in progress as when a new correlation group starts, then the previous groups is forced completed.',
                group: 'advanced',
              },
              eagerCheckCompletion: {
                type: 'boolean',
                title: 'Eager Check Completion',
                description:
                  'Use eager completion checking which means that the completionPredicate will use the incoming Exchange. As opposed to without eager completion checking the completionPredicate will use the aggregated Exchange.',
                group: 'common',
              },
              ignoreInvalidCorrelationKeys: {
                type: 'boolean',
                title: 'Ignore Invalid Correlation Keys',
                description:
                  'If a correlation key cannot be successfully evaluated it will be ignored by logging a DEBUG and then just ignore the incoming Exchange.',
                group: 'advanced',
              },
              closeCorrelationKeyOnCompletion: {
                type: 'number',
                title: 'Close Correlation Key On Completion',
                description:
                  'Closes a correlation key when its complete. Any late received exchanges which has a correlation key that has been closed, it will be defined and a ClosedCorrelationKeyException is thrown.',
                group: 'advanced',
              },
              discardOnCompletionTimeout: {
                type: 'boolean',
                title: 'Discard On Completion Timeout',
                description:
                  'Discards the aggregated message on completion timeout. This means on timeout the aggregated message is dropped and not sent out of the aggregator.',
                group: 'advanced',
              },
              discardOnAggregationFailure: {
                type: 'boolean',
                title: 'Discard On Aggregation Failure',
                description:
                  'Discards the aggregated message when aggregation failed (an exception was thrown from AggregationStrategy . This means the partly aggregated message is dropped and not sent out of the aggregator. This option cannot be used together with completionFromBatchConsumer.',
                group: 'advanced',
              },
              forceCompletionOnStop: {
                type: 'boolean',
                title: 'Force Completion On Stop',
                description: 'Indicates to complete all current aggregated exchanges when the context is stopped',
                group: 'advanced',
              },
              completeAllOnStop: {
                type: 'boolean',
                title: 'Complete All On Stop',
                description:
                  'Indicates to wait to complete all current and partial (pending) aggregated exchanges when the context is stopped. This also means that we will wait for all pending exchanges which are stored in the aggregation repository to complete so the repository is empty before we can stop. You may want to enable this when using the memory based aggregation repository that is memory based only, and do not store data on disk. When this option is enabled, then the aggregator is waiting to complete all those exchanges before its stopped, when stopping CamelContext or the route using it.',
                group: 'advanced',
              },
            },
            $comment: 'steps',
            required: ['correlationExpression'],
          },
          definition: {
            id: 'aggregate-1087',
          },
        } as VisualComponentSchema;
      },
      updateModel: () => {},
      getBaseEntity: () => {},
    } as unknown as IVisualizationNode,
  },
};

export default {
  title: 'Canvas/Aggregate',
  component: CanvasSideBar,
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  return (
    <VisibleFlowsProvider>
      <CanvasSideBar {...args} onClose={() => {}} />
    </VisibleFlowsProvider>
  );
};

export const AggregateNode = Template.bind({});
AggregateNode.args = {
  selectedNode,
};
