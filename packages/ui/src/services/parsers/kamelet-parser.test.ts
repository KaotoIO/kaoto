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
      expect(parsedTables).toHaveLength(4);

      expect(parsedTables[0].title).toBe('Steps');
      expect(parsedTables[0].description).toBe('');
      expect(parsedTables[0].headingLevel).toBe('h1');
      expect(parsedTables[0].headers).toHaveLength(5);
      expect(parsedTables[0].headers[0]).toBe('Step ID');
      expect(parsedTables[0].headers[1]).toBe('Step');
      expect(parsedTables[0].headers[2]).toBe('URI');
      expect(parsedTables[0].headers[3]).toBe('Parameter Name');
      expect(parsedTables[0].headers[4]).toBe('Value');
      expect(parsedTables[0].data).toHaveLength(4);
      expect(parsedTables[0].data[0][0]).toBeUndefined();
      expect(parsedTables[0].data[0][1]).toBe('from');
      expect(parsedTables[0].data[0][2]).toBe('timer');
      expect(parsedTables[0].data[0][3]).toBe('period');
      expect(parsedTables[0].data[0][4]).toBe('{{period}}');

      expect(parsedTables[1].title).toBe('Definition');
      expect(parsedTables[1].description).toBe('Produces periodic events about random users!');
      expect(parsedTables[1].headingLevel).toBe('h1');
      expect(parsedTables[1].headers).toHaveLength(3);
      expect(parsedTables[1].headers[0]).toBe('Property Name');
      expect(parsedTables[1].headers[1]).toBe('Meta Property Name');
      expect(parsedTables[1].headers[2]).toBe('Value');
      expect(parsedTables[1].data).toHaveLength(7);
      expect(parsedTables[1].data[0][0]).toBe('(root)');
      expect(parsedTables[1].data[0][1]).toBe('title');
      expect(parsedTables[1].data[0][2]).toBe('User Source');

      expect(parsedTables[2].title).toBe('Types');
      expect(parsedTables[2].description).toBe('');
      expect(parsedTables[2].headingLevel).toBe('h1');
      expect(parsedTables[2].headers).toHaveLength(2);
      expect(parsedTables[2].headers[0]).toBe('IN/OUT');
      expect(parsedTables[2].headers[1]).toBe('Media Type');
      expect(parsedTables[2].data).toHaveLength(1);
      expect(parsedTables[2].data[0][0]).toBe('out');
      expect(parsedTables[2].data[0][1]).toBe('application/json');

      expect(parsedTables[3].title).toBe('Dependencies');
      expect(parsedTables[3].description).toBe('');
      expect(parsedTables[3].headingLevel).toBe('h1');
      expect(parsedTables[3].headers).toHaveLength(1);
      expect(parsedTables[3].headers[0]).toBe('Dependency');
      expect(parsedTables[3].data).toHaveLength(3);
      expect(parsedTables[3].data[0][0]).toBe('camel:timer');
    });
  });
});
