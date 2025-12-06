import { ICamelElementLookupResult } from '../models/visualization/flows/support/camel-component-types';
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

  describe('getSemanticString', () => {
    it.each([
      [{}, {}, undefined],
      [{ processorName: 'to', componentName: 'direct' }, { parameters: { name: 'anotherWorld' } }, 'anotherWorld'],
    ] as Array<[ICamelElementLookupResult, unknown, string | undefined]>)(
      'for `%s` with `%s` value, it should return %s',
      (camelElementLookup, value, expected) => {
        expect(CamelUriHelper.getSemanticString(camelElementLookup, value)).toBe(expected);
      },
    );
  });

  describe('getParametersFromPathString', () => {
    it.each([
      { syntax: undefined, uri: undefined, result: {} },
      { syntax: 'log:loggerName', uri: undefined, result: {} },
      { syntax: undefined, uri: 'log:myLogger', result: {} },
      { syntax: 'log:loggerName', uri: 'log:myLogger', result: { loggerName: 'myLogger' } },
      { syntax: 'log:loggerName', uri: 'log', result: {} },
      { syntax: 'log', uri: 'log:myLogger', result: {} },
      {
        syntax: 'kamelet:templateId/routeId',
        uri: 'kamelet:MyTemplate/MyRouteId',
        result: { templateId: 'MyTemplate', routeId: 'MyRouteId' },
      },
      { syntax: 'kamelet:templateId/routeId', uri: 'kamelet:MyTemplate', result: { templateId: 'MyTemplate' } },
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

  describe('getUriStringFromParameters', () => {
    it.each([
      {
        uri: 'kamelet:MyTemplate/MyRouteId',
        syntax: 'kamelet:templateId/routeId',
        parameters: { templateId: 'MyTemplate', routeId: 'MyRouteId' },
        result: 'kamelet:MyTemplate/MyRouteId',
      },
      {
        uri: 'kamelet:MyTemplate',
        syntax: 'kamelet:templateId/routeId',
        parameters: { templateId: 'MyTemplate' },
        result: 'kamelet:MyTemplate',
      },
      { uri: 'log', syntax: 'log', parameters: {}, result: 'log' },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: undefined,
        result: 'timer',
      },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: { timerName: undefined },
        result: 'timer',
      },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: null,
        result: 'timer',
      },
      {
        uri: 'timer',
        syntax: 'timer:timerName',
        parameters: {},
        result: 'timer',
      },
      {
        uri: 'timer:myTimer',
        syntax: 'timer:timerName',
        parameters: { timerName: 'myTimer' },
        result: 'timer:myTimer',
      },
      {
        uri: 'timer:myTimer',
        syntax: 'timer:timerName',
        parameters: { timerName: 'myTimer', groupDelay: 1000, groupSize: 5 },
        result: 'timer:myTimer?groupDelay=1000&groupSize=5',
      },
      { uri: 'as2', syntax: 'as2:apiName/methodName', parameters: {}, result: 'as2' },
      {
        uri: 'activemq',
        syntax: 'activemq:destinationType:destinationName',
        parameters: { destinationType: 'queue', destinationName: 'myQueue' },
        result: 'activemq:queue:myQueue',
      },
      {
        uri: 'as2:CLIENT/GET',
        syntax: 'as2:apiName/methodName',
        parameters: {
          apiName: 'CLIENT',
          methodName: 'GET',
        },
        result: 'as2:CLIENT/GET',
      },
      {
        uri: 'atmosphere-websocket',
        syntax: 'atmosphere-websocket:servicePath',
        parameters: { servicePath: '//localhost:8080/echo' },
        result: 'atmosphere-websocket://localhost:8080/echo',
      },
      {
        uri: 'avro',
        syntax: 'avro:transport:host:port/messageName',
        parameters: { transport: 'netty', host: 'localhost', port: 41414, messageName: 'foo' },
        requiredParameters: ['transport', 'host', 'port'],
        result: 'avro:netty:localhost:41414/foo',
      },
      {
        uri: 'avro',
        syntax: 'avro:transport:host:port/messageName',
        parameters: {},
        requiredParameters: ['transport', 'host', 'port'],
        result: 'avro:::',
      },
      {
        uri: 'aws2-eventbridge',
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        parameters: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
        requiredParameters: ['eventbusNameOrArn'],
        result: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
      },
      {
        uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        parameters: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
        requiredParameters: ['eventbusNameOrArn'],
        result: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
      },
      {
        uri: 'jms',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationType: 'queue', destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: 'jms:queue:myQueue',
      },
      {
        uri: 'jms',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: 'jms:queue:myQueue',
      },
      {
        uri: 'jms:myQueue',
        syntax: 'jms:destinationType:destinationName',
        parameters: { destinationName: 'myQueue' },
        requiredParameters: ['destinationName'],
        defaultValues: { destinationType: 'queue' },
        result: 'jms:queue:myQueue',
      },
      {
        uri: 'http',
        syntax: 'http://httpUri',
        parameters: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: 'http://helloworld.io/api/greetings/{header.name}',
      },
      {
        uri: 'https',
        syntax: 'https://httpUri',
        parameters: { httpUri: 'helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: 'https://helloworld.io/api/greetings/{header.name}',
      },
      {
        uri: 'https',
        syntax: 'https://httpUri',
        parameters: { httpUri: 'https://helloworld.io/api/greetings/{header.name}' },
        requiredParameters: ['httpUri'],
        result: 'https://helloworld.io/api/greetings/{header.name}',
      },
      {
        uri: 'ftp',
        syntax: 'ftp:host:port/directoryName',
        parameters: { host: 'localhost', port: 21, directoryName: 'a/nested/directory' },
        requiredParameters: ['host'],
        result: 'ftp:localhost:21/a/nested/directory',
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { specificationUri: 'afile-openapi.json', operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: 'rest-openapi:afile-openapi.json#myOperationId',
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { specificationUri: '', operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: 'rest-openapi:openapi.json#myOperationId',
      },
      {
        uri: 'rest-openapi',
        syntax: 'rest-openapi:specificationUri#operationId',
        parameters: { operationId: 'myOperationId' },
        defaultValues: { specificationUri: 'openapi.json' },
        requiredParameters: ['operationId'],
        result: 'rest-openapi:openapi.json#myOperationId',
      },
      {
        uri: 'rest',
        syntax: 'rest:method:path:uriTemplate',
        parameters: { uriTemplate: '{header.name}' },
        requiredParameters: ['method', 'path'],
        result: 'rest:::{header.name}',
      },
      {
        uri: 'rest',
        syntax: 'rest:method:path:uriTemplate',
        parameters: { method: 'options', path: 'myPath' },
        requiredParameters: ['method', 'path'],
        result: 'rest:options:myPath',
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

  describe('expression handling in query parameters', () => {
    it('should not encode {{ }} expression placeholders', () => {
      const result = CamelUriHelper['getUriStringFromParameters'](
        'timer',
        'timer:timerName',
        { period: '{{demo.period}}' }
      );

      expect(result).toBe('timer?period={{demo.period}}');
    });

    it('should not encode ${ } expression placeholders', () => {
      const result = CamelUriHelper['getUriStringFromParameters'](
        'direct',
        'direct:channel',
        { headerValue: '${header.foo}' }
      );

      expect(result).toBe('direct?headerValue=${header.foo}');
    });

    it('should still encode literal values when needed', () => {
      const result = CamelUriHelper['getUriStringFromParameters'](
        'timer',
        'timer:timerName',
        { custom: 'value with space' }
      );

      expect(result).toBe('timer?custom=value%20with%20space');
    });
  });


  describe('getParametersFromQueryString', () => {
    it.each([
      { queryString: undefined, result: {} },
      { queryString: '', result: {} },
      { queryString: 'period=5000&delay=5&synchronous=true', result: { period: 5000, delay: 5, synchronous: true } },
      {
        queryString: 'period=50.75&delay=5,00&synchronous=true&invalidParameter=test',
        result: { period: 50.75, delay: '5,00', synchronous: true, invalidParameter: 'test' },
      },
    ])('should return `$result` for `$queryString`', ({ queryString, result }) => {
      expect(CamelUriHelper.getParametersFromQueryString(queryString)).toEqual(result);
    });
  });
});
