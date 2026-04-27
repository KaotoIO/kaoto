/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelProcessorDefinition } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { BeansXmlParser } from './beans-xml-parser';

export const getElementFromXml = (xml: string): Element => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'application/xml');
  return xmlDoc.documentElement;
};

describe('BeanXmlParser', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const registry = DynamicCatalogRegistry.get();

    // Create processor catalog from catalogsMap.modelCatalogMap
    const processorProvider = {
      id: 'test-processor-provider',
      fetch: async (key: string) => {
        return catalogsMap.modelCatalogMap[key];
      },
      fetchAll: async () => {
        return catalogsMap.modelCatalogMap;
      },
    };

    const processorCatalog = new DynamicCatalog<ICamelProcessorDefinition>(processorProvider);
    registry.setCatalog(CatalogKind.Processor, processorCatalog);
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('parse bean constructors properly', () => {
    const beansElement = getElementFromXml(`
        <bean>
        <constructors>
            <constructor index="0" value="true"/>
            <constructor index="1" value="Hello World"/>
        </constructors>
        </bean>`);

    const result = BeansXmlParser.parseBeanConstructors(beansElement);
    expect(result).toEqual({
      '0': 'true',
      '1': 'Hello World',
    });
  });

  it('parse bean constructors without index defined', () => {
    const beansElement = getElementFromXml(`
        <bean>
        <constructors>
            <constructor value="true"/>
            <constructor value="Hello World"/>
        </constructors>
        </bean>`);

    const result = BeansXmlParser.parseBeanConstructors(beansElement);
    expect(result).toEqual({
      '0': 'true',
      '1': 'Hello World',
    });
  });

  it('parse Properties correctly ', () => {
    const beanProperties = getElementFromXml(`<bean> <properties>
            <property key="field1" value="f1_p" />
            <property key="field2" value="f2_p" />
            <property key="nested.field1" value="nf1_p" />
            <property key="nested.field2" value="nf2_p" />
        </properties>
    </bean>`);

    const result = BeansXmlParser.parseBeanProperties(beanProperties);
    expect(result).toEqual({
      field1: 'f1_p',
      field2: 'f2_p',
      'nested.field1': 'nf1_p',
      'nested.field2': 'nf2_p',
    });
  });

  it('transformBeanFactory should return a promise when using async DynamicCatalog', async () => {
    const beanElement = getElementFromXml(`
        <bean id="myBean" class="com.example.MyClass">
        <constructors>
            <constructor index="0" value="true"/>
        </constructors>
        </bean>`);

    const result = BeansXmlParser.transformBeanFactory(beanElement);
    expect(result).toBeInstanceOf(Promise);

    const bean = await result;
    expect(bean).toBeDefined();
    expect(bean.name).toEqual('myBean');
    expect(bean.type).toEqual('com.example.MyClass');
  });

  it('transformBeansSection should return a promise when using async DynamicCatalog', async () => {
    const parser = new BeansXmlParser();
    const beansElement = getElementFromXml(`
        <beans>
          <bean id="bean1" class="com.example.Bean1"/>
          <bean id="bean2" class="com.example.Bean2"/>
        </beans>`);

    const result = parser.transformBeansSection(beansElement);
    expect(result).toBeInstanceOf(Promise);

    const beans = await result;
    expect(beans).toBeDefined();
    expect(beans.length).toBe(2);
    expect(beans[0].name).toEqual('bean1');
    expect(beans[1].name).toEqual('bean2');
  });
});
