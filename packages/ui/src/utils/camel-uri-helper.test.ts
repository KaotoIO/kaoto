import { CamelUriHelper } from './camel-uri-helper';

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
});
