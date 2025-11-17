import { KameletBindingVisualEntity, PipeVisualEntity } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { ParsedTable } from '../../models/documentation';
import { PipeErrorHandlerEntity } from '../../models/visualization/metadata/pipeErrorHandlerEntity';
import { kameletBindingYaml, pipeYaml } from '../../stubs';
import { pipeTimerSourceYaml } from '../../stubs/pipe-timer-source';
import { PipeParser } from './pipe-parser';

describe('PipeParser', () => {
  describe('parsePipeEntity()', () => {
    it('should parse pipe', () => {
      const pipeEntity = CamelResourceFactory.createCamelResource(pipeYaml).getVisualEntities()[0] as PipeVisualEntity;
      const parsed = PipeParser.parsePipeEntity(pipeEntity);

      expect(parsed.title).toEqual('Steps');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(4);
      expect(parsed.headers[0]).toEqual('Step Type');
      expect(parsed.headers[1]).toEqual('Endpoint');
      expect(parsed.headers[2]).toEqual('Property Name');
      expect(parsed.headers[3]).toEqual('Value');
      expect(parsed.data.length).toEqual(9);
      expect(parsed.data[0][0]).toEqual('source');
      expect(parsed.data[0][1]).toEqual('REF Kind');
      expect(parsed.data[0][2]).toEqual('');
      expect(parsed.data[0][3]).toEqual('Kamelet');
    });

    it('should parse pipe with properties', () => {
      const pipeEntity = CamelResourceFactory.createCamelResource(
        pipeTimerSourceYaml,
      ).getVisualEntities()[0] as PipeVisualEntity;
      const parsed = PipeParser.parsePipeEntity(pipeEntity);

      expect(parsed.data[3][0]).toEqual('');
      expect(parsed.data[3][1]).toEqual('');
      expect(parsed.data[3][2]).toEqual('message');
      expect(parsed.data[3][3]).toEqual('Hello world!');
    });
  });

  describe('parseKameletBindingEntity()', () => {
    it('should parse kamelet binding', () => {
      const kbEntity = CamelResourceFactory.createCamelResource(
        kameletBindingYaml,
      ).getVisualEntities()[0] as KameletBindingVisualEntity;
      const parsed = PipeParser.parseKameletBindingEntity(kbEntity);

      expect(parsed.title).toEqual('Steps');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(4);
      expect(parsed.headers[0]).toEqual('Step Type');
      expect(parsed.headers[1]).toEqual('Endpoint');
      expect(parsed.headers[2]).toEqual('Property Name');
      expect(parsed.headers[3]).toEqual('Value');
      expect(parsed.data.length).toEqual(9);
      expect(parsed.data[0][0]).toEqual('source');
      expect(parsed.data[0][1]).toEqual('REF Kind');
      expect(parsed.data[0][2]).toEqual('');
      expect(parsed.data[0][3]).toEqual('Kamelet');
    });
  });

  describe('parsePipeErrorHandlerEntity()', () => {
    it('should parse pipe error handler', () => {
      const pehEntity = CamelResourceFactory.createCamelResource(pipeYaml)
        .getEntities()
        .find((e) => e instanceof PipeErrorHandlerEntity) as PipeErrorHandlerEntity;
      const parsed = PipeParser.parsePipeErrorHandlerEntity(pehEntity, 'Pipe Error Handler') as ParsedTable;

      expect(parsed.title).toEqual('Pipe Error Handler');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(3);
      expect(parsed.headers[0]).toEqual('Type');
      expect(parsed.headers[1]).toEqual('Parameter Name');
      expect(parsed.headers[2]).toEqual('Value');
      expect(parsed.data.length).toEqual(2);
      expect(parsed.data[0][0]).toEqual('log');
      expect(parsed.data[0][1]).toEqual('maximumRedeliveries');
      expect(parsed.data[0][2]).toEqual(3);
    });
  });
});
