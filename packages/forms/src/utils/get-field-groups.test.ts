import { JSONSchema4 } from 'json-schema';
import { TimerComponentSchema } from '../stubs/timer.component.schema';
import { getFieldGroups } from './get-field-groups';

describe('getFieldGroups', () => {
  let inputValue: JSONSchema4['properties'];

  it('should get a object with common array and groups object containing advance groups array', () => {
    inputValue = {
      id: {
        type: 'string',
        title: 'Id',
        description: 'Sets the id of this node',
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Sets the description of this node',
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
        type: 'object',
        format: 'expression',
        $comment: 'group:common',
      },
      optimisticLockRetryPolicy: {
        title: 'Optimistic Lock Retry Policy',
        description: 'To configure optimistic locking',
        $ref: '#/definitions/org.apache.camel.model.OptimisticLockRetryPolicyDefinition',
        format: 'class:org.apache.camel.model.OptimisticLockRetryPolicyDefinition',
        $comment: 'group:advanced',
        type: 'object',
        additionalProperties: false,
        properties: {
          exponentialBackOff: {
            type: 'boolean',
            title: 'Exponential Back Off',
            description: 'Enable exponential backoff',
          },
          maximumRetries: {
            type: 'number',
            title: 'Maximum Retries',
            description: 'Sets the maximum number of retries',
          },
          maximumRetryDelay: {
            type: 'string',
            title: 'Maximum Retry Delay',
            description:
              'Sets the upper value of retry in millis between retries, when using exponential or random backoff',
            default: '1000',
          },
          randomBackOff: {
            type: 'boolean',
            title: 'Random Back Off',
            description: 'Enables random backoff',
          },
          retryDelay: {
            type: 'string',
            title: 'Retry Delay',
            description: 'Sets the delay in millis between retries',
            default: '50',
          },
        },
      },
    };

    const expectedOutputValue = {
      common: {
        id: inputValue.id,
        description: inputValue.description,
        correlationExpression: inputValue.correlationExpression,
      },
      groups: [
        [
          'advanced',
          {
            disabled: inputValue.disabled,
            optimisticLockRetryPolicy: inputValue.optimisticLockRetryPolicy,
          },
        ],
      ],
    };
    const propertiesArray = getFieldGroups(inputValue);
    expect(propertiesArray).toEqual(expectedOutputValue);
  });

  it('should get an object with common group and groups object containing different groups array', () => {
    const expectedOutputValue = {
      common: {
        timerName: TimerComponentSchema.properties!.timerName,
        delay: TimerComponentSchema.properties!.delay,
        fixedRate: TimerComponentSchema.properties!.fixedRate,
        includeMetadata: TimerComponentSchema.properties!.includeMetadata,
        period: TimerComponentSchema.properties!.period,
        repeatCount: TimerComponentSchema.properties!.repeatCount,
      },
      groups: [
        [
          'consumer (advanced)',
          {
            bridgeErrorHandler: TimerComponentSchema.properties!.bridgeErrorHandler,
            exceptionHandler: TimerComponentSchema.properties!.exceptionHandler,
            exchangePattern: TimerComponentSchema.properties!.exchangePattern,
          },
        ],
        [
          'scheduler',
          {
            runLoggingLevel: TimerComponentSchema.properties!.runLoggingLevel,
          },
        ],
        [
          'advanced',
          {
            daemon: TimerComponentSchema.properties!.daemon,
            pattern: TimerComponentSchema.properties!.pattern,
            synchronous: TimerComponentSchema.properties!.synchronous,
            time: TimerComponentSchema.properties!.time,
            timer: TimerComponentSchema.properties!.timer,
          },
        ],
      ],
    };

    const propertiesArray = getFieldGroups(TimerComponentSchema.properties);

    expect(propertiesArray).toEqual(expectedOutputValue);
  });

  it('should get an object with empty common object and empty groups object', () => {
    inputValue = {};

    const expectedOutputValue = {
      common: {},
      groups: [],
    };
    const propertiesArray = getFieldGroups(inputValue);
    expect(propertiesArray).toEqual(expectedOutputValue);
  });
});
