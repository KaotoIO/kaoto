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

  describe('uriSyntaxToParameters', () => {
    it.each([
      { syntax: 'log:loggerName', uri: 'log:myLogger', result: { loggerName: 'myLogger' } },
      { syntax: 'log', uri: 'log:myLogger', result: {} },
      {
        syntax: 'timer:timerName',
        uri: 'timer:timer-1?period=5000&delay=5&synchronous=true',
        result: { timerName: 'timer-1', period: 5000, delay: 5, synchronous: true },
      },
      {
        syntax: 'timer:timerName',
        uri: 'timer:timer-1?period=50.75&delay=5,00&synchronous=true',
        result: { timerName: 'timer-1', period: 50.75, delay: '5,00', synchronous: true },
      },
      {
        syntax: 'activemq:destinationType:destinationName',
        uri: 'activemq:queue:myQueue?selector=foo',
        result: { destinationType: 'queue', destinationName: 'myQueue', selector: 'foo' },
      },
      {
        syntax: 'as2:apiName/methodName',
        uri: 'as2:CLIENT/GET?encryptingAlgorithm=AES256_GCM&signingAlgorithm=MD5WITHRSA',
        result: {
          apiName: 'CLIENT',
          methodName: 'GET',
          encryptingAlgorithm: 'AES256_GCM',
          signingAlgorithm: 'MD5WITHRSA',
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
        result: { transport: '', host: '', port: '', messageName: '' },
      },
      {
        syntax: 'aws2-eventbridge://eventbusNameOrArn',
        uri: 'aws2-eventbridge://arn:aws:iam::123456789012:user/johndoe',
        result: { eventbusNameOrArn: 'arn:aws:iam::123456789012:user/johndoe' },
      },
    ])('for an URI: `$uri`, using the syntax: `$syntax`, should return `$result`', ({ syntax, uri, result }) => {
      expect(CamelUriHelper.uriSyntaxToParameters(syntax, uri)).toEqual(result);
    });
  });
});
