import { BeansParser } from './beans-parser';
import { beansYaml } from '../../stubs/beans';
import { BeansEntity } from '../../models/visualization/metadata';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';

describe('BeansParser', () => {
  describe('parseBeansEntity()', () => {
    it('should parse BeansEntity', () => {
      const beansEntity = CamelResourceFactory.createCamelResource(beansYaml).getEntities()[0] as BeansEntity;
      const parsedTable = BeansParser.parseBeansEntity(beansEntity, 'Beans');
      expect(parsedTable.title).toEqual('Beans');
      expect(parsedTable.data.length).toEqual(3);
      expect(parsedTable.headers.length).toEqual(4);
      expect(parsedTable.headers[0]).toEqual('Name');
      expect(parsedTable.headers[1]).toEqual('Type');
      expect(parsedTable.headers[2]).toEqual('Property Name');
      expect(parsedTable.headers[3]).toEqual('Property Value');
      expect(parsedTable.data[0][0]).toEqual('myBean');
      expect(parsedTable.data[0][1]).toEqual('io.kaoto.MyBean');
      expect(parsedTable.data[0][2]).toEqual('p1');
      expect(parsedTable.data[0][3]).toEqual('p1v');
    });

    it('should parse BeansEntity without properties', () => {
      const beansEntity = CamelResourceFactory.createCamelResource(beansYaml).getEntities()[0] as BeansEntity;
      beansEntity.parent.beans.forEach((bean) => (bean.properties = {}));
      const parsedTable = BeansParser.parseBeansEntity(beansEntity, 'Beans');
      expect(parsedTable.title).toEqual('Beans');
      expect(parsedTable.data.length).toEqual(2);
      expect(parsedTable.data[0][0]).toEqual('myBean');
      expect(parsedTable.data[0][1]).toEqual('io.kaoto.MyBean');
      expect(parsedTable.data[0][2]).toEqual('');
      expect(parsedTable.data[0][3]).toEqual('');
      expect(parsedTable.data[1][0]).toEqual('myBean2');
      expect(parsedTable.data[1][1]).toEqual('io.kaoto.MyBean');
      expect(parsedTable.data[1][2]).toEqual('');
      expect(parsedTable.data[1][3]).toEqual('');
    });
  });
});
