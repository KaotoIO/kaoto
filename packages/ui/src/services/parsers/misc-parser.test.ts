import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { MetadataEntity } from '../../models/visualization/metadata';
import { pipeYaml } from '../../stubs';
import { MiscParser } from './misc-parser';

describe('MiscParser', () => {
  describe('parseMetadataEntity()', () => {
    it('should parse Metadata', () => {
      const metadataEntity = CamelResourceFactory.createCamelResource(pipeYaml)
        .getEntities()
        .find((entity) => entity instanceof MetadataEntity) as MetadataEntity;
      const parsedTables = MiscParser.parseMetadataEntity(metadataEntity, 'Metadata');

      expect(parsedTables).toHaveLength(2);

      expect(parsedTables[0].title).toBe('Metadata');
      expect(parsedTables[0].description).toBe('');
      expect(parsedTables[0].headingLevel).toBe('h1');
      expect(parsedTables[0].headers).toHaveLength(2);
      expect(parsedTables[0].headers[0]).toBe('Property Name');
      expect(parsedTables[0].headers[1]).toBe('Value');
      expect(parsedTables[0].data).toHaveLength(1);
      expect(parsedTables[0].data[0][0]).toBe('name');
      expect(parsedTables[0].data[0][1]).toBe('webhook-binding');

      expect(parsedTables[1].title).toBe('Metadata : Annotations');
      expect(parsedTables[1].description).toBe('');
      expect(parsedTables[1].headingLevel).toBe('h2');
      expect(parsedTables[1].headers).toHaveLength(2);
      expect(parsedTables[1].headers[0]).toBe('Name');
      expect(parsedTables[1].headers[1]).toBe('Value');
      expect(parsedTables[1].data).toHaveLength(11);
      expect(parsedTables[1].data[0][0]).toBe('sco1237896.github.com/catalog.group');
      expect(parsedTables[1].data[0][1]).toBe('messaging');
    });
  });
});
