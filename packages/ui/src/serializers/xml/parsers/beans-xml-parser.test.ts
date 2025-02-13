/*
 * Copyright (C) 2023 Red Hat, Inc.
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
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CamelCatalogService, CatalogKind } from '../../../models';

import { describe } from 'node:test';
import { BeansXmlParser } from './beans-xml-parser';

export const getElementFromXml = (xml: string): Element => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'application/xml');
  return xmlDoc.documentElement;
};

describe('BeanXmlParser', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
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
});
