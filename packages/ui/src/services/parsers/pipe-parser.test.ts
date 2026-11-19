import { KameletBindingVisualEntity, PipeVisualEntity } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { ParsedTable } from '../../models/documentation';
import { PipeErrorHandlerEntity } from '../../models/visualization/metadata/pipeErrorHandlerEntity';
import { kameletBindingYaml, pipeYaml } from '../../stubs';
import { pipeTimerSourceYaml } from '../../stubs/pipe-timer-source';
import { PipeParser } from './pipe-parser';

describe('PipeParser', () => {
  describe('parsePipeEntity()', () => {
    it('should parse pipe', async () => {
      const resource = CamelResourceFactory.createCamelResource(pipeYaml);
      await resource.initialize();
      const pipeEntity = resource.getVisualEntities()[0] as PipeVisualEntity;
      const parsed = PipeParser.parsePipeEntity(pipeEntity);

      expect(parsed.title).toBe('Steps');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(4);
      expect(parsed.headers[0]).toBe('Step Type');
      expect(parsed.headers[1]).toBe('Endpoint');
      expect(parsed.headers[2]).toBe('Property Name');
      expect(parsed.headers[3]).toBe('Value');
      expect(parsed.data).toHaveLength(9);
      expect(parsed.data[0][0]).toBe('source');
      expect(parsed.data[0][1]).toBe('REF Kind');
      expect(parsed.data[0][2]).toBe('');
      expect(parsed.data[0][3]).toBe('Kamelet');
    });

    it('should parse pipe with properties', async () => {
      const resource = CamelResourceFactory.createCamelResource(pipeTimerSourceYaml);
      await resource.initialize();
      const pipeEntity = resource.getVisualEntities()[0] as PipeVisualEntity;
      const parsed = PipeParser.parsePipeEntity(pipeEntity);

      expect(parsed.data[3][0]).toBe('');
      expect(parsed.data[3][1]).toBe('');
      expect(parsed.data[3][2]).toBe('message');
      expect(parsed.data[3][3]).toBe('Hello world!');
    });
  });

  describe('parseKameletBindingEntity()', () => {
    it('should parse kamelet binding', async () => {
      const resource = CamelResourceFactory.createCamelResource(kameletBindingYaml);
      await resource.initialize();
      const kbEntity = resource.getVisualEntities()[0] as KameletBindingVisualEntity;
      const parsed = PipeParser.parseKameletBindingEntity(kbEntity);

      expect(parsed.title).toBe('Steps');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(4);
      expect(parsed.headers[0]).toBe('Step Type');
      expect(parsed.headers[1]).toBe('Endpoint');
      expect(parsed.headers[2]).toBe('Property Name');
      expect(parsed.headers[3]).toBe('Value');
      expect(parsed.data).toHaveLength(9);
      expect(parsed.data[0][0]).toBe('source');
      expect(parsed.data[0][1]).toBe('REF Kind');
      expect(parsed.data[0][2]).toBe('');
      expect(parsed.data[0][3]).toBe('Kamelet');
    });
  });

  describe('parsePipeErrorHandlerEntity()', () => {
    it('should parse pipe error handler', async () => {
      const resource = CamelResourceFactory.createCamelResource(pipeYaml);
      await resource.initialize();
      const pehEntity = resource
        .getEntities()
        .find((e) => e instanceof PipeErrorHandlerEntity) as PipeErrorHandlerEntity;
      const parsed = PipeParser.parsePipeErrorHandlerEntity(pehEntity, 'Pipe Error Handler') as ParsedTable;

      expect(parsed.title).toBe('Pipe Error Handler');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(3);
      expect(parsed.headers[0]).toBe('Type');
      expect(parsed.headers[1]).toBe('Parameter Name');
      expect(parsed.headers[2]).toBe('Value');
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0][0]).toBe('log');
      expect(parsed.data[0][1]).toBe('maximumRedeliveries');
      expect(parsed.data[0][2]).toBe('3');
    });
  });

  describe('parsePipeEntity() endpoints', () => {
    it('lists URI endpoints and the properties of an endpoint without URI or reference', async () => {
      const resource = CamelResourceFactory.createCamelResource(`
apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: uri-pipe
spec:
  source:
    uri: timer:tick
  steps:
    - properties:
        delay: 500
  sink:
    uri: log:out
`);
      await resource.initialize();
      const pipeEntity = resource.getVisualEntities()[0] as PipeVisualEntity;

      const parsed = PipeParser.parsePipeEntity(pipeEntity);

      expect(parsed.data).toEqual([
        ['source', 'URI', '', 'timer:tick'],
        ['step', '', 'delay', '500'],
        ['sink', 'URI', '', 'log:out'],
      ]);
    });
  });

  describe('parsePipeErrorHandlerEntity() types', () => {
    const parse = (errorHandler: Record<string, unknown> | undefined) =>
      PipeParser.parsePipeErrorHandlerEntity(
        new PipeErrorHandlerEntity({ errorHandler } as ConstructorParameters<typeof PipeErrorHandlerEntity>[0]),
        'Error Handler',
      );

    it.each([
      ['no error handler', undefined],
      ['an empty error handler', {}],
    ])('returns nothing for %s', (_, errorHandler) => {
      expect(parse(errorHandler)).toBeUndefined();
    });

    it('shows the none error handler as its type only', () => {
      const parsed = parse({ none: {} });

      expect(parsed?.headers).toEqual(['Type']);
      expect(parsed?.data).toEqual([['none']]);
    });

    it('shows a log error handler without parameters as an empty table', () => {
      expect(parse({ log: {} })?.data).toEqual([]);
    });

    it('lists the URI endpoint and the parameters of a sink error handler', () => {
      const parsed = parse({
        sink: { endpoint: { uri: 'log:error' }, parameters: { maximumRedeliveries: 1 } },
      });

      expect(parsed?.headers).toEqual(['Type', 'Endpoint', 'Parameter Name', 'Value']);
      expect(parsed?.data).toEqual([
        ['sink', 'URI', '', 'log:error'],
        ['', '', 'maximumRedeliveries', '1'],
      ]);
    });

    it('lists the referenced endpoint of a sink error handler', () => {
      const parsed = parse({
        sink: { endpoint: { ref: { kind: 'Kamelet', apiVersion: 'camel.apache.org/v1', name: 'error-sink' } } },
      });

      expect(parsed?.data).toEqual([
        ['sink', 'REF Kind', '', 'Kamelet'],
        ['', 'REF API Version', '', 'camel.apache.org/v1'],
        ['', 'REF Name', '', 'error-sink'],
      ]);
    });

    it('names the sink type on the first parameter when the sink has no endpoint', () => {
      expect(parse({ sink: { parameters: { maximumRedeliveries: 1 } } })?.data).toEqual([
        ['sink', '', 'maximumRedeliveries', '1'],
      ]);
    });

    it('dumps an error handler type it does not know as JSON', () => {
      const parsed = parse({ deadLetterChannel: { uri: 'log:dead' } });

      expect(parsed?.headers).toEqual(['JSON dump']);
      expect(parsed?.data).toEqual([[JSON.stringify({ errorHandler: { deadLetterChannel: { uri: 'log:dead' } } })]]);
    });
  });
});
