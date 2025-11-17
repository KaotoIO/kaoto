import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { BeansEntity } from '../../models/visualization/metadata';
import { beansWithParamsYaml, beansYaml } from '../../stubs/beans';
import { BeansParser } from './beans-parser';

describe('BeansParser', () => {
  describe('parseBeansEntity()', () => {
    it('should parse BeansEntity', () => {
      const beansEntity = CamelResourceFactory.createCamelResource(beansYaml).getEntities()[0] as BeansEntity;
      const parsedTable = BeansParser.parseBeansEntity(beansEntity, 'Beans');
      expect(parsedTable.title).toEqual('Beans');
      expect(parsedTable.data.length).toEqual(3);
      expect(parsedTable.headers.length).toEqual(5);
      expect(parsedTable.headers[0]).toEqual('Name');
      expect(parsedTable.headers[1]).toEqual('Type');
      expect(parsedTable.headers[2]).toEqual('Property Name');
      expect(parsedTable.headers[3]).toEqual('Parameter Name');
      expect(parsedTable.headers[4]).toEqual('Value');
      expect(parsedTable.data[0][0]).toEqual('myBean');
      expect(parsedTable.data[0][1]).toEqual('io.kaoto.MyBean');
      expect(parsedTable.data[0][2]).toEqual('p1');
      expect(parsedTable.data[0][3]).toEqual('');
      expect(parsedTable.data[0][4]).toEqual('p1v');
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
      expect(parsedTable.data[0][4]).toEqual('');
      expect(parsedTable.data[1][0]).toEqual('myBean2');
      expect(parsedTable.data[1][1]).toEqual('io.kaoto.MyBean');
      expect(parsedTable.data[1][2]).toEqual('');
      expect(parsedTable.data[1][3]).toEqual('');
      expect(parsedTable.data[1][4]).toEqual('');
    });

    it('should parse BeanEntity with parameters', () => {
      const beansEntity = CamelResourceFactory.createCamelResource(beansWithParamsYaml).getEntities()[0] as BeansEntity;
      const parsedTable = BeansParser.parseBeansEntity(beansEntity, 'Beans');
      expect(parsedTable.data.length).toEqual(7);
      expect(parsedTable.data[0][0]).toEqual('test');
      expect(parsedTable.data[0][1]).toEqual('java.util.Timer');
      expect(parsedTable.data[0][2]).toEqual('foo');
      expect(parsedTable.data[0][3]).toEqual('');
      expect(parsedTable.data[0][4]).toEqual('bar');
      expect(parsedTable.data[1][0]).toEqual('');
      expect(parsedTable.data[1][1]).toEqual('');
      expect(parsedTable.data[1][2]).toEqual('');
      expect(parsedTable.data[1][3]).toEqual('builderClass');
      expect(parsedTable.data[1][4]).toEqual('test');
      expect(parsedTable.data[2][0]).toEqual('');
      expect(parsedTable.data[2][1]).toEqual('');
      expect(parsedTable.data[2][2]).toEqual('');
      expect(parsedTable.data[2][3]).toEqual('builderMethod');
      expect(parsedTable.data[3][4]).toEqual('test');
      expect(parsedTable.data[3][0]).toEqual('');
      expect(parsedTable.data[3][1]).toEqual('');
      expect(parsedTable.data[3][2]).toEqual('');
      expect(parsedTable.data[3][3]).toEqual('destroyMethod');
      expect(parsedTable.data[3][4]).toEqual('test');
      expect(parsedTable.data[4][0]).toEqual('');
      expect(parsedTable.data[4][1]).toEqual('');
      expect(parsedTable.data[4][2]).toEqual('');
      expect(parsedTable.data[4][3]).toEqual('factoryBean');
      expect(parsedTable.data[4][4]).toEqual('test');
      expect(parsedTable.data[5][0]).toEqual('');
      expect(parsedTable.data[5][1]).toEqual('');
      expect(parsedTable.data[5][2]).toEqual('');
      expect(parsedTable.data[5][3]).toEqual('factoryMethod');
      expect(parsedTable.data[5][4]).toEqual('test');
      expect(parsedTable.data[6][0]).toEqual('');
      expect(parsedTable.data[6][1]).toEqual('');
      expect(parsedTable.data[6][2]).toEqual('');
      expect(parsedTable.data[6][3]).toEqual('initMethod');
      expect(parsedTable.data[6][4]).toEqual('test');
    });
  });
});
