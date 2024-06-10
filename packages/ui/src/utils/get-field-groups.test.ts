import { getFieldGroups } from './get-field-groups';

describe('useFieldGroups', () => {
  let inputValue: { [name: string]: unknown };

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
      optimisticLockRetryPolicy: {
        title: 'Optimistic Lock Retry Policy',
        description: 'To configure optimistic locking',
        $ref: '#/definitions/org.apache.camel.model.OptimisticLockRetryPolicyDefinition',
        $comment: 'class:org.apache.camel.model.OptimisticLockRetryPolicyDefinition',
        group: 'advanced',
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
      common: ['id', 'description', 'correlationExpression'],
      groups: {
        advanced: ['disabled', 'optimisticLockRetryPolicy'],
      },
    };
    const propertiesArray = getFieldGroups(inputValue);
    expect(propertiesArray).toEqual(expectedOutputValue);
  });

  it('should get a object with common array and groups object containing differnt groups array', () => {
    inputValue = {
      timerName: {
        title: 'Timer Name',
        group: 'consumer',
        description: 'The name of the timer',
        type: 'string',
        deprecated: false,
      },
      delay: {
        title: 'Delay',
        group: 'consumer',
        description: 'Delay before first event is triggered.',
        format: 'duration',
        type: 'string',
        deprecated: false,
        default: '1000',
      },
      fixedRate: {
        title: 'Fixed Rate',
        group: 'consumer',
        description: 'Events take place at approximately regular intervals, separated by the specified period.',
        type: 'boolean',
        deprecated: false,
        default: false,
      },
      includeMetadata: {
        title: 'Include Metadata',
        group: 'consumer',
        description: 'Whether to include metadata in the exchange such as fired time, timer name, timer count etc.',
        type: 'boolean',
        deprecated: false,
        default: false,
      },
      period: {
        title: 'Period',
        group: 'consumer',
        description: 'If greater than 0, generate periodic events every period.',
        format: 'duration',
        type: 'string',
        deprecated: false,
        default: '1000',
      },
      repeatCount: {
        title: 'Repeat Count',
        group: 'consumer',
        description:
          'Specifies a maximum limit of number of fires. So if you set it to 1, the timer will only fire once. If you set it to 5, it will only fire five times. A value of zero or negative means fire forever.',
        type: 'integer',
        deprecated: false,
      },
      bridgeErrorHandler: {
        title: 'Bridge Error Handler',
        group: 'consumer (advanced)',
        description:
          'Allows for bridging the consumer to the Camel routing Error Handler, which mean any exceptions (if possible) occurred while the Camel consumer is trying to pickup incoming messages, or the likes, will now be processed as a message and handled by the routing Error Handler. Important: This is only possible if the 3rd party component allows Camel to be alerted if an exception was thrown. Some components handle this internally only, and therefore bridgeErrorHandler is not possible. In other situations we may improve the Camel component to hook into the 3rd party component and make this possible for future releases. By default the consumer will use the org.apache.camel.spi.ExceptionHandler to deal with exceptions, that will be logged at WARN or ERROR level and ignored.',
        type: 'boolean',
        deprecated: false,
        default: false,
      },
      exceptionHandler: {
        title: 'Exception Handler',
        group: 'consumer (advanced)',
        description:
          'To let the consumer use a custom ExceptionHandler. Notice if the option bridgeErrorHandler is enabled then this option is not in use. By default the consumer will deal with exceptions, that will be logged at WARN or ERROR level and ignored.',
        type: 'string',
        deprecated: false,
        $comment: 'class:org.apache.camel.spi.ExceptionHandler',
      },
      exchangePattern: {
        title: 'Exchange Pattern',
        group: 'consumer (advanced)',
        description: 'Sets the exchange pattern when the consumer creates an exchange.',
        type: 'string',
        deprecated: false,
        enum: ['InOnly', 'InOut'],
      },
      daemon: {
        title: 'Daemon',
        group: 'advanced',
        description:
          'Specifies whether or not the thread associated with the timer endpoint runs as a daemon. The default value is true.',
        type: 'boolean',
        deprecated: false,
        default: true,
      },
      pattern: {
        title: 'Pattern',
        group: 'advanced',
        description: 'Allows you to specify a custom Date pattern to use for setting the time option using URI syntax.',
        type: 'string',
        deprecated: false,
      },
      synchronous: {
        title: 'Synchronous',
        group: 'advanced',
        description: 'Sets whether synchronous processing should be strictly used',
        type: 'boolean',
        deprecated: false,
        default: false,
      },
      time: {
        title: 'Time',
        group: 'advanced',
        description:
          "A java.util.Date the first event should be generated. If using the URI, the pattern expected is: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd'T'HH:mm:ss.",
        type: 'string',
        deprecated: false,
      },
      timer: {
        title: 'Timer',
        group: 'advanced',
        description: 'To use a custom Timer',
        type: 'string',
        deprecated: false,
        $comment: 'class:java.util.Timer',
      },
      runLoggingLevel: {
        title: 'Run Logging Level',
        group: 'scheduler',
        description:
          'The consumer logs a start/complete log line when it polls. This option allows you to configure the logging level for that.',
        type: 'string',
        deprecated: false,
        default: 'TRACE',
        enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
      },
    };

    const expectedOutputValue = {
      common: ['timerName', 'delay', 'fixedRate', 'includeMetadata', 'period', 'repeatCount'],
      groups: {
        'consumer (advanced)': ['bridgeErrorHandler', 'exceptionHandler', 'exchangePattern'],
        advanced: ['daemon', 'pattern', 'synchronous', 'time', 'timer'],
        scheduler: ['runLoggingLevel'],
      },
    };
    const propertiesArray = getFieldGroups(inputValue);
    expect(propertiesArray).toEqual(expectedOutputValue);
  });

  it('should get a object with empty common array and emplty groups object', () => {
    inputValue = {};

    const expectedOutputValue = {
      common: [],
      groups: {},
    };
    const propertiesArray = getFieldGroups(inputValue);
    expect(propertiesArray).toEqual(expectedOutputValue);
  });
});
