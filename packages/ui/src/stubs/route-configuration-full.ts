export const routeConfigurationFullYaml = `
- routeConfiguration:
    id: routeConfiguration-1956
    errorHandler:
      defaultErrorHandler:
        level: ERROR
    intercept:
      - intercept:
          id: intercept-2829
          steps:
            - to:
                id: to-4106
                description: some desc intercept activemq
                uri: activemq
                parameters:
                destinationName: myQueue
                destinationOptions: {}
    interceptFrom:
      - interceptFrom:
          id: interceptFrom-3077
          steps:
            - to:
                id: to-4830
                uri: activemq6
                parameters: {}
    interceptSendToEndpoint:
      - interceptSendToEndpoint:
          id: interceptSendToEndpoint-1407
          uri: 'direct:dummy'
          steps:
            - to:
                id: to-1386
                uri: amqp
                parameters: {}
    onCompletion:
      - onCompletion:
          id: onCompletion-3828
          steps:
            - to:
                id: to-2313
                uri: asterisk
                parameters: {}
    onException:
      - onException:
          id: onException-2301
          steps:
            - to:
                id: to-3485
                uri: arangodb
                parameters: {}
`;
