import { JSONSchema4 } from 'json-schema';

export const TimerComponentSchema: JSONSchema4 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    timerName: {
      title: 'Timer Name',
      $comment: 'group:consumer',
      description: 'The name of the timer',
      type: 'string',
      deprecated: false,
    },
    delay: {
      title: 'Delay',
      $comment: 'group:consumer',
      description:
        'The number of milliseconds to wait before the first event is generated. Should not be used in conjunction with the time option. The default value is 1000.',
      format: 'duration',
      type: 'string',
      deprecated: false,
      default: '1000',
    },
    fixedRate: {
      title: 'Fixed Rate',
      $comment: 'group:consumer',
      description: 'Events take place at approximately regular intervals, separated by the specified period.',
      type: 'boolean',
      deprecated: false,
      default: false,
    },
    includeMetadata: {
      title: 'Include Metadata',
      $comment: 'group:consumer',
      description: 'Whether to include metadata in the exchange such as fired time, timer name, timer count etc.',
      type: 'boolean',
      deprecated: false,
      default: false,
    },
    period: {
      title: 'Period',
      $comment: 'group:consumer',
      description: 'Generate periodic events every period. Must be zero or positive value. The default value is 1000.',
      format: 'duration',
      type: 'string',
      deprecated: false,
      default: '1000',
    },
    repeatCount: {
      title: 'Repeat Count',
      $comment: 'group:consumer',
      description:
        'Specifies a maximum limit for the number of fires. Therefore, if you set it to 1, the timer will only fire once. If you set it to 5, it will only fire five times. A value of zero or negative means fire forever.',
      type: 'integer',
      deprecated: false,
    },
    bridgeErrorHandler: {
      title: 'Bridge Error Handler',
      $comment: 'group:consumer (advanced)',
      description:
        'Allows for bridging the consumer to the Camel routing Error Handler, which mean any exceptions (if possible) occurred while the Camel consumer is trying to pickup incoming messages, or the likes, will now be processed as a message and handled by the routing Error Handler. Important: This is only possible if the 3rd party component allows Camel to be alerted if an exception was thrown. Some components handle this internally only, and therefore bridgeErrorHandler is not possible. In other situations we may improve the Camel component to hook into the 3rd party component and make this possible for future releases. By default the consumer will use the org.apache.camel.spi.ExceptionHandler to deal with exceptions, that will be logged at WARN or ERROR level and ignored.',
      type: 'boolean',
      deprecated: false,
      default: false,
    },
    exceptionHandler: {
      title: 'Exception Handler',
      $comment: 'group:consumer (advanced)',
      description:
        'To let the consumer use a custom ExceptionHandler. Notice if the option bridgeErrorHandler is enabled then this option is not in use. By default the consumer will deal with exceptions, that will be logged at WARN or ERROR level and ignored.',
      type: 'string',
      deprecated: false,
      format: 'class:org.apache.camel.spi.ExceptionHandler',
    },
    exchangePattern: {
      title: 'Exchange Pattern',
      $comment: 'group:consumer (advanced)',
      description: 'Sets the exchange pattern when the consumer creates an exchange.',
      type: 'string',
      deprecated: false,
      enum: ['InOnly', 'InOut'],
    },
    daemon: {
      title: 'Daemon',
      $comment: 'group:advanced',
      description:
        'Specifies whether the thread associated with the timer endpoint runs as a daemon. The default value is true.',
      type: 'boolean',
      deprecated: false,
      default: true,
    },
    pattern: {
      title: 'Pattern',
      $comment: 'group:advanced',
      description: 'Allows you to specify a custom Date pattern to use for setting the time option using URI syntax.',
      type: 'string',
      deprecated: false,
    },
    synchronous: {
      title: 'Synchronous',
      $comment: 'group:advanced',
      description: 'Sets whether synchronous processing should be strictly used',
      type: 'boolean',
      deprecated: false,
      default: false,
    },
    time: {
      title: 'Time',
      $comment: 'group:advanced',
      description:
        "A java.util.Date the first event should be generated. If using the URI, the pattern expected is: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd'T'HH:mm:ss.",
      type: 'string',
      deprecated: false,
    },
    timer: {
      title: 'Timer',
      $comment: 'group:advanced',
      description: 'To use a custom Timer',
      type: 'string',
      deprecated: false,
      format: 'class:java.util.Timer',
    },
    runLoggingLevel: {
      title: 'Run Logging Level',
      $comment: 'group:scheduler',
      description:
        'The consumer logs a start/complete log line when it polls. This option allows you to configure the logging level for that.',
      type: 'string',
      deprecated: false,
      default: 'TRACE',
      enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
    },
  },
  required: ['timerName'],
};
