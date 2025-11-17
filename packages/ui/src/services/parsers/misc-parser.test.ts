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

      expect(parsedTables.length).toEqual(2);

      expect(parsedTables[0].title).toEqual('Metadata');
      expect(parsedTables[0].description).toEqual('');
      expect(parsedTables[0].headingLevel).toEqual('h1');
      expect(parsedTables[0].headers.length).toEqual(2);
      expect(parsedTables[0].headers[0]).toEqual('Property Name');
      expect(parsedTables[0].headers[1]).toEqual('Value');
      expect(parsedTables[0].data.length).toEqual(1);
      expect(parsedTables[0].data[0][0]).toEqual('name');
      expect(parsedTables[0].data[0][1]).toEqual('webhook-binding');

      expect(parsedTables[1].title).toEqual('Metadata : Annotations');
      expect(parsedTables[1].description).toEqual('');
      expect(parsedTables[1].headingLevel).toEqual('h2');
      expect(parsedTables[1].headers.length).toEqual(2);
      expect(parsedTables[1].headers[0]).toEqual('Name');
      expect(parsedTables[1].headers[1]).toEqual('Value');
      expect(parsedTables[1].data.length).toEqual(11);
      expect(parsedTables[1].data[0][0]).toEqual('sco1237896.github.com/catalog.group');
      expect(parsedTables[1].data[0][1]).toEqual('messaging');
    });
  });
});
