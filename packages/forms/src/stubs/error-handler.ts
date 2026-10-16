import { JSONSchema4 } from 'json-schema';

export const errorHandlerSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  oneOf: [
    {
      type: 'object',
      required: ['deadLetterChannel'],
      properties: {
        deadLetterChannel: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.DeadLetterChannelDefinition',
        },
      },
    },
    {
      not: {
        anyOf: [
          {
            required: ['deadLetterChannel'],
          },
          {
            required: ['defaultErrorHandler'],
          },
          {
            required: ['jtaTransactionErrorHandler'],
          },
          {
            required: ['noErrorHandler'],
          },
          {
            required: ['refErrorHandler'],
          },
          {
            required: ['springTransactionErrorHandler'],
          },
        ],
      },
    },
    {
      type: 'object',
      required: ['defaultErrorHandler'],
      properties: {
        defaultErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.DefaultErrorHandlerDefinition',
        },
      },
    },
    {
      type: 'object',
      required: ['jtaTransactionErrorHandler'],
      properties: {
        jtaTransactionErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.JtaTransactionErrorHandlerDefinition',
        },
      },
    },
    {
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.NoErrorHandlerDefinition',
        },
      },
    },
    {
      type: 'object',
      required: ['refErrorHandler'],
      properties: {
        refErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.RefErrorHandlerDefinition',
        },
      },
    },
    {
      type: 'object',
      required: ['springTransactionErrorHandler'],
      properties: {
        springTransactionErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.SpringTransactionErrorHandlerDefinition',
        },
      },
    },
  ],
  properties: {
    deadLetterChannel: {},
    defaultErrorHandler: {},
    jtaTransactionErrorHandler: {},
    noErrorHandler: {},
    refErrorHandler: {},
    springTransactionErrorHandler: {},
  },
  $schema: 'http://json-schema.org/draft-04/schema#',
  definitions: {
    'org.apache.camel.model.errorhandler.DeadLetterChannelDefinition': {
      title: 'Dead Letter Channel',
      description: 'Error handler with dead letter queue.',
      type: 'object',
      additionalProperties: false,
      properties: {
        deadLetterHandleNewException: {
          type: 'boolean',
          title: 'Dead Letter Handle New Exception',
          description:
            "Whether the dead letter channel should handle (and ignore) any new exception that may been thrown during sending the message to the dead letter endpoint. The default value is true which means any such kind of exception is handled and ignored. Set this to false to let the exception be propagated back on the org.apache.camel.Exchange . This can be used in situations where you use transactions, and want to use Camel's dead letter channel to deal with exceptions during routing, but if the dead letter channel itself fails because of a new exception being thrown, then by setting this to false the new exceptions is propagated back and set on the org.apache.camel.Exchange , which allows the transaction to detect the exception, and rollback.",
        },
        deadLetterUri: {
          type: 'string',
          title: 'Dead Letter Uri',
          description: 'The dead letter endpoint uri for the Dead Letter error handler.',
        },
        executorServiceRef: {
          type: 'string',
          title: 'Executor Service Ref',
          description: 'Sets a reference to a thread pool to be used by the error handler',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
        level: {
          type: 'string',
          title: 'Level',
          description: 'Logging level to use by error handler',
          default: 'ERROR',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        logName: {
          type: 'string',
          title: 'Log Name',
          description: 'Name of the logger to use by the error handler',
        },
        loggerRef: {
          type: 'string',
          title: 'Logger Ref',
          description: 'References to a logger to use as logger for the error handler',
        },
        onExceptionOccurredRef: {
          type: 'string',
          title: 'On Exception Occurred Ref',
          description:
            'Sets a reference to a processor that should be processed just after an exception occurred. Can be used to perform custom logging about the occurred exception at the exact time it happened. Important: Any exception thrown from this processor will be ignored.',
        },
        onPrepareFailureRef: {
          type: 'string',
          title: 'On Prepare Failure Ref',
          description:
            'Sets a reference to a processor to prepare the org.apache.camel.Exchange before handled by the failure processor / dead letter channel. This allows for example to enrich the message before sending to a dead letter queue.',
        },
        onRedeliveryRef: {
          type: 'string',
          title: 'On Redelivery Ref',
          description:
            'Sets a reference to a processor that should be processed before a redelivery attempt. Can be used to change the org.apache.camel.Exchange before its being redelivered.',
        },
        redeliveryPolicy: {
          title: 'Redelivery Policy',
          description: 'Sets the redelivery settings',
          $ref: '#/definitions/org.apache.camel.model.RedeliveryPolicyDefinition',
        },
        redeliveryPolicyRef: {
          type: 'string',
          title: 'Redelivery Policy Ref',
          description: 'Sets a reference to a RedeliveryPolicy to be used for redelivery settings.',
        },
        retryWhileRef: {
          type: 'string',
          title: 'Retry While Ref',
          description: 'Sets a retry while predicate. Will continue retrying until the predicate evaluates to false.',
        },
        useOriginalBody: {
          type: 'boolean',
          title: 'Use Original Body',
          description:
            'Will use the original input org.apache.camel.Message body (original body only) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
        useOriginalMessage: {
          type: 'boolean',
          title: 'Use Original Message',
          description:
            'Will use the original input org.apache.camel.Message (original body and headers) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
      },
      required: ['deadLetterUri'],
    },
    'org.apache.camel.model.errorhandler.DefaultErrorHandlerDefinition': {
      title: 'Default Error Handler',
      description: 'The default error handler.',
      type: 'object',
      additionalProperties: false,
      properties: {
        executorServiceRef: {
          type: 'string',
          title: 'Executor Service Ref',
          description: 'Sets a reference to a thread pool to be used by the error handler',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
        level: {
          type: 'string',
          title: 'Level',
          description: 'Logging level to use by error handler',
          default: 'ERROR',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        logName: {
          type: 'string',
          title: 'Log Name',
          description: 'Name of the logger to use by the error handler',
        },
        loggerRef: {
          type: 'string',
          title: 'Logger Ref',
          description: 'References to a logger to use as logger for the error handler',
        },
        onExceptionOccurredRef: {
          type: 'string',
          title: 'On Exception Occurred Ref',
          description:
            'Sets a reference to a processor that should be processed just after an exception occurred. Can be used to perform custom logging about the occurred exception at the exact time it happened. Important: Any exception thrown from this processor will be ignored.',
        },
        onPrepareFailureRef: {
          type: 'string',
          title: 'On Prepare Failure Ref',
          description:
            'Sets a reference to a processor to prepare the org.apache.camel.Exchange before handled by the failure processor / dead letter channel. This allows for example to enrich the message before sending to a dead letter queue.',
        },
        onRedeliveryRef: {
          type: 'string',
          title: 'On Redelivery Ref',
          description:
            'Sets a reference to a processor that should be processed before a redelivery attempt. Can be used to change the org.apache.camel.Exchange before its being redelivered.',
        },
        redeliveryPolicy: {
          title: 'Redelivery Policy',
          description: 'Sets the redelivery settings',
          $ref: '#/definitions/org.apache.camel.model.RedeliveryPolicyDefinition',
        },
        redeliveryPolicyRef: {
          type: 'string',
          title: 'Redelivery Policy Ref',
          description: 'Sets a reference to a RedeliveryPolicy to be used for redelivery settings.',
        },
        retryWhileRef: {
          type: 'string',
          title: 'Retry While Ref',
          description: 'Sets a retry while predicate. Will continue retrying until the predicate evaluates to false.',
        },
        useOriginalBody: {
          type: 'boolean',
          title: 'Use Original Body',
          description:
            'Will use the original input org.apache.camel.Message body (original body only) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
        useOriginalMessage: {
          type: 'boolean',
          title: 'Use Original Message',
          description:
            'Will use the original input org.apache.camel.Message (original body and headers) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
      },
    },
    'org.apache.camel.model.errorhandler.JtaTransactionErrorHandlerDefinition': {
      title: 'Jta Transaction Error Handler',
      description: 'JTA based transactional error handler (requires camel-jta).',
      type: 'object',
      additionalProperties: false,
      properties: {
        executorServiceRef: {
          type: 'string',
          title: 'Executor Service Ref',
          description: 'Sets a reference to a thread pool to be used by the error handler',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
        level: {
          type: 'string',
          title: 'Level',
          description: 'Logging level to use by error handler',
          default: 'ERROR',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        logName: {
          type: 'string',
          title: 'Log Name',
          description: 'Name of the logger to use by the error handler',
        },
        loggerRef: {
          type: 'string',
          title: 'Logger Ref',
          description: 'References to a logger to use as logger for the error handler',
        },
        onExceptionOccurredRef: {
          type: 'string',
          title: 'On Exception Occurred Ref',
          description:
            'Sets a reference to a processor that should be processed just after an exception occurred. Can be used to perform custom logging about the occurred exception at the exact time it happened. Important: Any exception thrown from this processor will be ignored.',
        },
        onPrepareFailureRef: {
          type: 'string',
          title: 'On Prepare Failure Ref',
          description:
            'Sets a reference to a processor to prepare the org.apache.camel.Exchange before handled by the failure processor / dead letter channel. This allows for example to enrich the message before sending to a dead letter queue.',
        },
        onRedeliveryRef: {
          type: 'string',
          title: 'On Redelivery Ref',
          description:
            'Sets a reference to a processor that should be processed before a redelivery attempt. Can be used to change the org.apache.camel.Exchange before its being redelivered.',
        },
        redeliveryPolicy: {
          title: 'Redelivery Policy',
          description: 'Sets the redelivery settings',
          $ref: '#/definitions/org.apache.camel.model.RedeliveryPolicyDefinition',
        },
        redeliveryPolicyRef: {
          type: 'string',
          title: 'Redelivery Policy Ref',
          description: 'Sets a reference to a RedeliveryPolicy to be used for redelivery settings.',
        },
        retryWhileRef: {
          type: 'string',
          title: 'Retry While Ref',
          description: 'Sets a retry while predicate. Will continue retrying until the predicate evaluates to false.',
        },
        rollbackLoggingLevel: {
          type: 'string',
          title: 'Rollback Logging Level',
          description: 'Sets the logging level to use for logging transactional rollback. This option is default WARN.',
          default: 'WARN',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        transactedPolicyRef: {
          type: 'string',
          title: 'Transacted Policy Ref',
          description:
            'The transacted policy to use that is configured for either Spring or JTA based transactions. If no policy has been configured then Camel will attempt to auto-discover.',
        },
        useOriginalBody: {
          type: 'boolean',
          title: 'Use Original Body',
          description:
            'Will use the original input org.apache.camel.Message body (original body only) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
        useOriginalMessage: {
          type: 'boolean',
          title: 'Use Original Message',
          description:
            'Will use the original input org.apache.camel.Message (original body and headers) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
      },
    },
    'org.apache.camel.model.errorhandler.NoErrorHandlerDefinition': {
      title: 'No Error Handler',
      description: 'To not use an error handler.',
      type: 'object',
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
      },
    },
    'org.apache.camel.model.errorhandler.RefErrorHandlerDefinition': {
      title: 'Ref Error Handler',
      description: 'References to an existing or custom error handler.',
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: {
              type: 'string',
              title: 'Id',
              description: 'The id of this node',
            },
            ref: {
              type: 'string',
              title: 'Ref',
              description: 'References to an existing or custom error handler.',
            },
          },
        },
      ],
      required: ['ref'],
    },
    'org.apache.camel.model.errorhandler.SpringTransactionErrorHandlerDefinition': {
      title: 'Spring Transaction Error Handler',
      description: 'Spring based transactional error handler (requires camel-spring).',
      type: 'object',
      additionalProperties: false,
      properties: {
        executorServiceRef: {
          type: 'string',
          title: 'Executor Service Ref',
          description: 'Sets a reference to a thread pool to be used by the error handler',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
        level: {
          type: 'string',
          title: 'Level',
          description: 'Logging level to use by error handler',
          default: 'ERROR',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        logName: {
          type: 'string',
          title: 'Log Name',
          description: 'Name of the logger to use by the error handler',
        },
        loggerRef: {
          type: 'string',
          title: 'Logger Ref',
          description: 'References to a logger to use as logger for the error handler',
        },
        onExceptionOccurredRef: {
          type: 'string',
          title: 'On Exception Occurred Ref',
          description:
            'Sets a reference to a processor that should be processed just after an exception occurred. Can be used to perform custom logging about the occurred exception at the exact time it happened. Important: Any exception thrown from this processor will be ignored.',
        },
        onPrepareFailureRef: {
          type: 'string',
          title: 'On Prepare Failure Ref',
          description:
            'Sets a reference to a processor to prepare the org.apache.camel.Exchange before handled by the failure processor / dead letter channel. This allows for example to enrich the message before sending to a dead letter queue.',
        },
        onRedeliveryRef: {
          type: 'string',
          title: 'On Redelivery Ref',
          description:
            'Sets a reference to a processor that should be processed before a redelivery attempt. Can be used to change the org.apache.camel.Exchange before its being redelivered.',
        },
        redeliveryPolicy: {
          title: 'Redelivery Policy',
          description: 'Sets the redelivery settings',
          $ref: '#/definitions/org.apache.camel.model.RedeliveryPolicyDefinition',
        },
        redeliveryPolicyRef: {
          type: 'string',
          title: 'Redelivery Policy Ref',
          description: 'Sets a reference to a RedeliveryPolicy to be used for redelivery settings.',
        },
        retryWhileRef: {
          type: 'string',
          title: 'Retry While Ref',
          description: 'Sets a retry while predicate. Will continue retrying until the predicate evaluates to false.',
        },
        rollbackLoggingLevel: {
          type: 'string',
          title: 'Rollback Logging Level',
          description: 'Sets the logging level to use for logging transactional rollback. This option is default WARN.',
          default: 'WARN',
          enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
        },
        transactedPolicyRef: {
          type: 'string',
          title: 'Transacted Policy Ref',
          description:
            'The transacted policy to use that is configured for either Spring or JTA based transactions. If no policy has been configured then Camel will attempt to auto-discover.',
        },
        useOriginalBody: {
          type: 'boolean',
          title: 'Use Original Body',
          description:
            'Will use the original input org.apache.camel.Message body (original body only) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
        useOriginalMessage: {
          type: 'boolean',
          title: 'Use Original Message',
          description:
            'Will use the original input org.apache.camel.Message (original body and headers) when an org.apache.camel.Exchange is moved to the dead letter queue. Notice: this only applies when all redeliveries attempt have failed and the org.apache.camel.Exchange is doomed for failure. Instead of using the current inprogress org.apache.camel.Exchange IN message we use the original IN message instead. This allows you to store the original input in the dead letter queue instead of the inprogress snapshot of the IN message. For instance if you route transform the IN body during routing and then failed. With the original exchange store in the dead letter queue it might be easier to manually re submit the org.apache.camel.Exchange again as the IN message is the same as when Camel received it. So you should be able to send the org.apache.camel.Exchange to the same input. The difference between useOriginalMessage and useOriginalBody is that the former includes both the original body and headers, where as the latter only includes the original body. You can use the latter to enrich the message with custom headers and include the original message body. The former wont let you do this, as its using the original message body and headers as they are. You cannot enable both useOriginalMessage and useOriginalBody. The original input message is defensively copied, and the copied message body is converted to org.apache.camel.StreamCache if possible (stream caching is enabled, can be disabled globally or on the original route), to ensure the body can be read when the original message is being used later. If the body is converted to org.apache.camel.StreamCache then the message body on the current org.apache.camel.Exchange is replaced with the org.apache.camel.StreamCache body. If the body is not converted to org.apache.camel.StreamCache then the body will not be able to re-read when accessed later. Important: The original input means the input message that are bounded by the current org.apache.camel.spi.UnitOfWork . An unit of work typically spans one route, or multiple routes if they are connected using internal endpoints such as direct or seda. When messages is passed via external endpoints such as JMS or HTTP then the consumer will create a new unit of work, with the message it received as input as the original input. Also some EIP patterns such as splitter, multicast, will create a new unit of work boundary for the messages in their sub-route (eg the splitted message); however these EIPs have an option named shareUnitOfWork which allows to combine with the parent unit of work in regard to error handling and therefore use the parent original message. By default this feature is off.',
        },
      },
    },
    'org.apache.camel.model.RedeliveryPolicyDefinition': {
      title: 'Redelivery Policy',
      description: 'To configure re-delivery for error handling',
      type: 'object',
      additionalProperties: false,
      properties: {
        allowRedeliveryWhileStopping: {
          type: 'boolean',
          title: 'Allow Redelivery While Stopping',
          description:
            'Controls whether to allow redelivery while stopping/shutting down a route that uses error handling.',
        },
        asyncDelayedRedelivery: {
          type: 'boolean',
          title: 'Async Delayed Redelivery',
          description:
            "Allow asynchronous delayed redelivery. The route, in particular the consumer's component, must support the Asynchronous Routing Engine (e.g. seda).",
        },
        backOffMultiplier: {
          type: 'number',
          title: 'Back Off Multiplier',
          description: 'Sets the back off multiplier',
          default: '2.0',
        },
        collisionAvoidanceFactor: {
          type: 'number',
          title: 'Collision Avoidance Factor',
          description: 'Sets the collision avoidance factor',
          default: '0.15',
        },
        delayPattern: {
          type: 'string',
          title: 'Delay Pattern',
          description: 'Sets the delay pattern with delay intervals.',
        },
        disableRedelivery: {
          type: 'boolean',
          title: 'Disable Redelivery',
          description: 'Disables redelivery (same as setting maximum redeliveries to 0)',
        },
        exchangeFormatterRef: {
          type: 'string',
          title: 'Exchange Formatter Ref',
          description:
            'Sets the reference of the instance of org.apache.camel.spi.ExchangeFormatter to generate the log message from exchange.',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'The id of this node',
        },
        logContinued: {
          type: 'boolean',
          title: 'Log Continued',
          description:
            'Sets whether continued exceptions should be logged or not. Can be used to include or reduce verbose.',
        },
        logExhausted: {
          type: 'boolean',
          title: 'Log Exhausted',
          description:
            'Sets whether exhausted exceptions should be logged or not. Can be used to include or reduce verbose.',
        },
        logExhaustedMessageBody: {
          type: 'boolean',
          title: 'Log Exhausted Message Body',
          description:
            'Sets whether exhausted message body should be logged including message history or not (supports property placeholders). Can be used to include or reduce verbose. Requires logExhaustedMessageHistory to be enabled.',
        },
        logExhaustedMessageHistory: {
          type: 'boolean',
          title: 'Log Exhausted Message History',
          description:
            'Sets whether exhausted exceptions should be logged including message history or not (supports property placeholders). Can be used to include or reduce verbose.',
        },
        logHandled: {
          type: 'boolean',
          title: 'Log Handled',
          description:
            'Sets whether handled exceptions should be logged or not. Can be used to include or reduce verbose.',
        },
        logNewException: {
          type: 'boolean',
          title: 'Log New Exception',
          description:
            'Sets whether new exceptions should be logged or not. Can be used to include or reduce verbose. A new exception is an exception that was thrown while handling a previous exception.',
        },
        logRetryAttempted: {
          type: 'boolean',
          title: 'Log Retry Attempted',
          description: 'Sets whether retry attempts should be logged or not. Can be used to include or reduce verbose.',
        },
        logRetryStackTrace: {
          type: 'boolean',
          title: 'Log Retry Stack Trace',
          description:
            'Sets whether stack traces should be logged when an retry attempt failed. Can be used to include or reduce verbose.',
        },
        logStackTrace: {
          type: 'boolean',
          title: 'Log Stack Trace',
          description: 'Sets whether stack traces should be logged. Can be used to include or reduce verbose.',
        },
        maximumRedeliveries: {
          type: 'number',
          title: 'Maximum Redeliveries',
          description:
            'Sets the maximum redeliveries x = redeliver at most x times 0 = no redeliveries -1 = redeliver forever',
        },
        maximumRedeliveryDelay: {
          type: 'string',
          title: 'Maximum Redelivery Delay',
          description: 'Sets the maximum delay between redelivery',
          default: '60000',
        },
        redeliveryDelay: {
          type: 'string',
          title: 'Redelivery Delay',
          description: 'Sets the initial redelivery delay',
          default: '1000',
        },
        retriesExhaustedLogLevel: {
          type: 'string',
          title: 'Retries Exhausted Log Level',
          description: 'Sets the logging level to use when retries have been exhausted',
          default: 'ERROR',
        },
        retryAttemptedLogInterval: {
          type: 'number',
          title: 'Retry Attempted Log Interval',
          description: 'Sets the interval to use for logging retry attempts',
          default: '1',
        },
        retryAttemptedLogLevel: {
          type: 'string',
          title: 'Retry Attempted Log Level',
          description: 'Sets the logging level to use for logging retry attempts',
          default: 'DEBUG',
        },
        useCollisionAvoidance: {
          type: 'boolean',
          title: 'Use Collision Avoidance',
          description: 'Turn on collision avoidance.',
        },
        useExponentialBackOff: {
          type: 'boolean',
          title: 'Use Exponential Back Off',
          description: 'Turn on exponential backk off',
        },
      },
    },
  },
};
