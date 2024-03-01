import { CamelUriHelper, ParsedParameters } from './camel-uri-helper';

describe('CamelUriHelper', () => {
  describe('getUriString', () => {
    it.each([
      [undefined, undefined],
      [null, undefined],
      [88, undefined],
      [true, undefined],
      [false, undefined],
      ['', undefined],
      [{ uri: '' }, undefined],
      [{ uri: undefined }, undefined],
      [{ uri: null }, undefined],
      [{ uri: 88 }, undefined],
      [{ uri: {} }, undefined],
      ['a string', 'a string'],
      [{ uri: 'a string' }, 'a string'],
    ])('should return `%s` for `%s`', (value, expected) => {
      expect(CamelUriHelper.getUriString(value)).toBe(expected);
    });
  });

  describe('getParametersFromPathString', () => {
    it.each([
      { syntax: undefined, uri: undefined, result: {} },
      { syntax: 'log:loggerName', uri: undefined, result: {} },
      { syntax: undefined, uri: 'log:myLogger', result: {} },
      { syntax: 'log:loggerName', uri: 'log:myLogger', result: { loggerName: 'myLogger' } },
      { syntax: 'log:loggerName', uri: 'log', result: {} },
      { syntax: 'log', uri: 'log:myLogger', result: {} },
      { syntax: 'as2:apiName/methodName', uri: 'as2', result: {} },
      {
        syntax: 'activemq:destinationType:destinationName',
        uri: 'activemq:queue:myQueue',
        result: { destinationType: 'queue', destinationName: 'myQueue' },
      },
      {
        syntax: 'as2:apiName/methodName',
        uri: 'as2:CLIENT/GET',
        result: {
          apiName: 'CLIENT',
          methodName: 'GET',
        },
      },
      {
        syntax: 'atmosphere-websocket:servicePath',
        uri: 'atmosphere-websocket://localhost:8080/echo',
        result: { servicePath: '//localhost:8080/echo' },
      },
      {
        syntax: 'avro:transport:host:port/messageName',
        uri: 'avro:netty:localhost:41414/foo',
        result: { transport: 'netty', host: 'localhost', port: 41414, messageName: 'foo' },
      },
      {
        syntax: 'avro:transport:host:port/messageName',
        uri: 'avro:::/',
        result: {},
      },
      {
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
        result: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
        requiredParameters: ['eventbusNameOrArn'],
      },
      {
        syntax: 'jms:destinationType:destinationName',
        uri: 'jms:queue:myQueue',
        result: { destinationType: 'queue', destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
      },
      {
        syntax: 'jms:destinationType:destinationName',
        uri: 'jms:myQueue',
        result: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
      },
      {
        syntax: 'jms:destinationType:destinationName',
        uri: 'jms:myQueue',
        result: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
      },
      {
        syntax: 'http://httpUri',
        uri: 'http://helloworld.io/api/greetings/{header.name}',
        requiredParameters: ['httpUri'],
        result: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
      },
      {
        syntax: 'https://httpUri',
        uri: 'https://helloworld.io/api/greetings/{header.name}',
        requiredParameters: ['httpUri'],
        result: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
      },
      {
        syntax: 'ftp:host:port/directoryName',
        uri: 'ftp:localhost:21/a/nested/directory',
        requiredParameters: ['host'],
        result: { host: 'localhost', port: 21, directoryName: 'a/nested/directory' },
      },
      {
        syntax: 'rest-openapi:specificationUri#operationId',
        uri: 'rest-openapi:afile-openapi.json#myOperationId',
        requiredParameters: ['operationId'],
        result: { specificationUri: 'afile-openapi.json', operationId: 'myOperationId' },
      },
      {
        syntax: 'rest:method:path:uriTemplate',
        uri: 'rest:::{header.name}',
        requiredParameters: ['method', 'path'],
        result: { uriTemplate: '{header.name}' },
      },
      {
        syntax: 'rest:method:path:uriTemplate',
        uri: 'rest:options:myPath:',
        requiredParameters: ['method', 'path'],
        result: { method: 'options', path: 'myPath' },
      },
    ])(
      'for an URI: `$uri`, using the syntax: `$syntax`, should return `$result`',
      ({ syntax, uri, result, requiredParameters }) => {
        expect(CamelUriHelper.getParametersFromPathString(syntax, uri, { requiredParameters })).toEqual(result);
      },
    );
  });

  describe('getParametersFromQueryString', () => {
    it.each([
      { queryString: undefined, result: {} },
      { queryString: '', result: {} },
      { queryString: 'period=5000&delay=5&synchronous=true', result: { period: 5000, delay: 5, synchronous: true } },
      {
        queryString: 'period=50.75&delay=5,00&synchronous=true',
        result: { period: 50.75, delay: '5,00', synchronous: true },
      },
    ])('should return `$result` for `$queryString`', ({ queryString, result }) => {
      expect(CamelUriHelper.getParametersFromQueryString(queryString)).toEqual(result);
    });
  });

  describe('getUriStringFromParameters', () => {
    it.each([
      { uri: 'log', syntax: 'log', parameters: {}, result: { uri: 'log', parameters: {} } },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: undefined,
        result: { uri: 'timer', parameters: undefined },
      },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: null,
        result: { uri: 'timer', parameters: null },
      },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: {},
        result: { uri: 'timer', parameters: {} },
      },
      {
        uri: 'timer:myTimer',
        syntax: 'timer:timerName',
        parameters: { timerName: 'myTimer' },
        result: { uri: 'timer:myTimer', parameters: {} },
      },
      {
        uri: 'timer:myTimer',
        syntax: 'timer:timerName',
        parameters: { timerName: 'myTimer', groupDelay: 1000, groupSize: 5 },
        result: { uri: 'timer:myTimer', parameters: { groupDelay: 1000, groupSize: 5 } },
      },
      { uri: 'as2', syntax: 'as2:apiName/methodName', parameters: {}, result: { uri: 'as2', parameters: {} } },
      {
        uri: 'activemq',
        syntax: 'activemq:destinationType:destinationName',
        parameters: { destinationType: 'queue', destinationName: 'myQueue' },
        result: { uri: 'activemq:queue:myQueue', parameters: {} },
      },
      {
        uri: 'as2:CLIENT/GET',
        syntax: 'as2:apiName/methodName',
        parameters: {
          apiName: 'CLIENT',
          methodName: 'GET',
        },
        result: { uri: 'as2:CLIENT/GET', parameters: {} },
      },
      {
        uri: 'atmosphere-websocket',
        syntax: 'atmosphere-websocket:servicePath',
        parameters: { servicePath: '//localhost:8080/echo' },
        result: { uri: 'atmosphere-websocket://localhost:8080/echo', parameters: {} },
      },
      {
        uri: 'avro',
        syntax: 'avro:transport:host:port/messageName',
        parameters: { transport: 'netty', host: 'localhost', port: 41414, messageName: 'foo' },
        requiredParameters: ['transport', 'host', 'port'],
        result: { uri: 'avro:netty:localhost:41414/foo', parameters: {} },
      },
      {
        uri: 'avro',
        syntax: 'avro:transport:host:port/messageName',
        parameters: {},
        requiredParameters: ['transport', 'host', 'port'],
        result: { uri: 'avro:::', parameters: {} },
      },
      {
        uri: 'aws2-eventbridge',
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        parameters: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
        requiredParameters: ['eventbusNameOrArn'],
        result: { uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe', parameters: {} },
      },
      {
        uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        parameters: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
        requiredParameters: ['eventbusNameOrArn'],
        result: { uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe', parameters: {} },
      },
      {
        uri: 'jms',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationType: 'queue', destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: { uri: 'jms:queue:myQueue', parameters: {} },
      },
      {
        uri: 'jms',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: { uri: 'jms:queue:myQueue', parameters: {} },
      },
      {
        uri: 'jms:myQueue',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: { uri: 'jms:queue:myQueue', parameters: {} },
      },
      {
        uri: 'http',
        syntax: 'http://httpUri',
        parameters: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: { uri: 'http://helloworld.io/api/greetings/{header.name}', parameters: {} },
      },
      {
        uri: 'https',
        syntax: 'https://httpUri',
        parameters: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: { uri: 'https://helloworld.io/api/greetings/{header.name}', parameters: {} },
      },
      {
        uri: 'https',
        syntax: 'https://httpUri',
        parameters: { httpUri: 'https://helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: { uri: 'https://helloworld.io/api/greetings/{header.name}', parameters: {} },
      },
      {
        uri: 'ftp',
        syntax: 'ftp:host:port/directoryName',
        parameters: { host: 'localhost', port: 21, directoryName: 'a/nested/directory' },
        requiredParameters: ['host'],
        result: { uri: 'ftp:localhost:21/a/nested/directory', parameters: {} },
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { specificationUri: 'afile-openapi.json', operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: { uri: 'rest-openapi:afile-openapi.json#myOperationId', parameters: {} },
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { specificationUri: '', operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: { uri: 'rest-openapi:openapi.json#myOperationId', parameters: {} },
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: { uri: 'rest-openapi:openapi.json#myOperationId', parameters: {} },
      },
      {
        uri: 'rest',
        syntax: 'rest:method:path:uriTemplate',
        parameters: { uriTemplate: '{header.name}' },
        requiredParameters: ['method', 'path'],
        result: { uri: 'rest:::{header.name}', parameters: {} },
      },
      {
        uri: 'rest',
        syntax: 'rest:method:path:uriTemplate',
        parameters: { method: 'options', path: 'myPath' },
        requiredParameters: ['method', 'path'],
        result: { uri: 'rest:options:myPath', parameters: {} },
      },
    ])(
      'should return `$result` for `$parameters`',
      ({ uri, syntax, parameters, requiredParameters, defaultValues: testDefaultValues, result }) => {
        const defaultValues = testDefaultValues ?? {};

        expect(
          CamelUriHelper.getUriStringFromParameters(uri, syntax, parameters as unknown as ParsedParameters, {
            requiredParameters,
            defaultValues,
          }),
        ).toEqual(result);
      },
    );
  });
});
