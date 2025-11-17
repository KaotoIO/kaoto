import { KameletVisualEntity } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { kameletYaml } from '../../stubs';
import { KameletParser } from './kamelet-parser';

describe('KameletParser', () => {
  describe('parseKameletEntity()', () => {
    it('should parse kamelet', () => {
      const kameletEntity = CamelResourceFactory.createCamelResource(
        kameletYaml,
      ).getVisualEntities()[0] as KameletVisualEntity;
      const parsedTables = KameletParser.parseKameletEntity(kameletEntity);
      expect(parsedTables.length).toEqual(4);

      expect(parsedTables[0].title).toEqual('Steps');
      expect(parsedTables[0].description).toEqual('');
      expect(parsedTables[0].headingLevel).toEqual('h1');
      expect(parsedTables[0].headers.length).toEqual(5);
      expect(parsedTables[0].headers[0]).toEqual('Step ID');
      expect(parsedTables[0].headers[1]).toEqual('Step');
      expect(parsedTables[0].headers[2]).toEqual('URI');
      expect(parsedTables[0].headers[3]).toEqual('Parameter Name');
      expect(parsedTables[0].headers[4]).toEqual('Value');
      expect(parsedTables[0].data.length).toEqual(4);
      expect(parsedTables[0].data[0][0]).toBeUndefined();
      expect(parsedTables[0].data[0][1]).toEqual('from');
      expect(parsedTables[0].data[0][2]).toEqual('timer');
      expect(parsedTables[0].data[0][3]).toEqual('period');
      expect(parsedTables[0].data[0][4]).toEqual('{{period}}');

      expect(parsedTables[1].title).toEqual('Definition');
      expect(parsedTables[1].description).toEqual('Produces periodic events about random users!');
      expect(parsedTables[1].headingLevel).toEqual('h1');
      expect(parsedTables[1].headers.length).toEqual(3);
      expect(parsedTables[1].headers[0]).toEqual('Property Name');
      expect(parsedTables[1].headers[1]).toEqual('Meta Property Name');
      expect(parsedTables[1].headers[2]).toEqual('Value');
      expect(parsedTables[1].data.length).toEqual(7);
      expect(parsedTables[1].data[0][0]).toEqual('(root)');
      expect(parsedTables[1].data[0][1]).toEqual('title');
      expect(parsedTables[1].data[0][2]).toEqual('User Source');

      expect(parsedTables[2].title).toEqual('Types');
      expect(parsedTables[2].description).toEqual('');
      expect(parsedTables[2].headingLevel).toEqual('h1');
      expect(parsedTables[2].headers.length).toEqual(2);
      expect(parsedTables[2].headers[0]).toEqual('IN/OUT');
      expect(parsedTables[2].headers[1]).toEqual('Media Type');
      expect(parsedTables[2].data.length).toEqual(1);
      expect(parsedTables[2].data[0][0]).toEqual('out');
      expect(parsedTables[2].data[0][1]).toEqual('application/json');

      expect(parsedTables[3].title).toEqual('Dependencies');
      expect(parsedTables[3].description).toEqual('');
      expect(parsedTables[3].headingLevel).toEqual('h1');
      expect(parsedTables[3].headers.length).toEqual(1);
      expect(parsedTables[3].headers[0]).toEqual('Dependency');
      expect(parsedTables[3].data.length).toEqual(3);
      expect(parsedTables[3].data[0][0]).toEqual('camel:timer');
    });
  });
});
