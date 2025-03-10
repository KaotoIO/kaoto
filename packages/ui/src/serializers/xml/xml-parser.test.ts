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
import { KaotoXmlParser, isXML } from './kaoto-xml-parser';
import { doTryCamelRouteJson, doTryCamelRouteXml } from '../../stubs';
import { beanWithConstructorAandProperties, beanWithConstructorAandPropertiesXML } from '../../stubs/beans';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../models';

describe('XmlParser', () => {
  let parser: KaotoXmlParser;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  beforeEach(async () => {
    parser = new KaotoXmlParser();
  });

  it('parses XML with a single route correctly', () => {
    const xml = `<camel><routes><route><from uri="direct:start" /></route></routes></camel>`;
    const result = parser.parseXML(xml);

    expect(result).toBeDefined();
    expect(result).toEqual([
      {
        route: {
          from: { uri: 'direct:start', steps: [] },
        },
      },
    ]);
  });

  it('parses XML with multiple routes correctly', () => {
    const xml = `<routes><route id="test"><from uri="direct:first" /></route><route><from uri="direct:second" /></route></routes>`;
    const result = parser.parseXML(xml);
    expect(result).toEqual([
      {
        route: { id: 'test', from: { uri: 'direct:first', steps: [] } },
      },
      {
        route: {
          from: { uri: 'direct:second', steps: [] },
        },
      },
    ]);
  });

  it('returns an empty array for XML with no routes', () => {
    const xml = `<routes></routes>`;
    const result = parser.parseXML(xml);
    expect(result).toEqual([]);
  });

  it('identifies valid XML correctly', () => {
    const xml = `<routes><route><from uri="direct:start" /></route></routes>`;
    expect(isXML(xml)).toBe(true);
  });

  it('identifies invalid XML correctly', () => {
    const xml = `not an xml`;
    expect(isXML(xml)).toBe(false);
  });

  it('parses XML with doTry correctly', () => {
    const result = parser.parseXML(doTryCamelRouteXml);
    expect(result).toEqual([doTryCamelRouteJson]);
  });

  it('parse beans correctly', () => {
    const result = parser.parseXML(beanWithConstructorAandPropertiesXML);
    expect(result).toEqual([beanWithConstructorAandProperties]);
  });
});
