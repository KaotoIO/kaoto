import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { describe } from 'node:test';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { getDocument, testSerializer } from './serializer-test-utils';
import { BeansXmlSerializer } from './beans-xml-serializer';

describe('BeanXmlParser', () => {
  const doc = getDocument();
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('parse bean constructors properly', () => {
    const entity = {
      name: 'beanFromProps',
      type: 'com.acme.MyBean',
      builderClass: 'com.acme.MyBeanBuilder',
      builderMethod: 'createMyBean',
      constructors: { '0': 'true', '1': 'Hello World' },
      properties: { field1: 'f1_p', field2: 'f2_p', 'nested.field1': 'nf1_p', 'nested.field2': 'nf2_p' },
    };
    const expected = `<bean name="beanFromProps" type="com.acme.MyBean" builderClass="com.acme.MyBeanBuilder" builderMethod="createMyBean">
  <constructors>
    <constructor index="0" value="true"/>
    <constructor index="1" value="Hello World"/>
  </constructors>
  <properties>
    <property key="field1" value="f1_p"/>
    <property key="field2" value="f2_p"/>
    <property key="nested.field1" value="nf1_p"/>
    <property key="nested.field2" value="nf2_p"/>
  </properties>
</bean>`;

    const bean = BeansXmlSerializer.serialize(entity, doc);
    expect(bean).toBeDefined();
    testSerializer(expected, bean!);
  });
});
