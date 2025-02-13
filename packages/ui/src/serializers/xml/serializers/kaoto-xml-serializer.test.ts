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
import { KaotoXmlSerializer } from './kaoto-xml-serializer';
import { EntityType } from '../../../models/camel/entities';
import { CamelCatalogService, CamelRouteVisualEntity, CatalogKind } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { normalizeXml } from './serializer-test-utils';
import { BeansEntity } from '../../../models/visualization/metadata';
import { CamelErrorHandlerVisualEntity } from '../../../models/visualization/flows/camel-error-handler-visual-entity';

describe('ToXMLConverter', () => {
  let domParser: DOMParser;
  let xmlSerializer: XMLSerializer;

  beforeAll(async () => {
    domParser = new DOMParser();
    xmlSerializer = new XMLSerializer();
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('Convert single route entity to XML correctly', () => {
    const doc = domParser.parseFromString(
      `<camel><route id="route-1"><from uri="direct:start"/><to uri="direct:end"/></route></camel>`,
      'application/xml',
    );

    const entity = {
      type: 'route',
      entityDef: {
        route: {
          id: 'route-1',
          from: { uri: 'direct:start', steps: [{ to: { uri: 'direct:end' } }] },
        },
      },
    };

    const result = KaotoXmlSerializer.serialize([entity as unknown as CamelRouteVisualEntity]);
    expect(xmlSerializer.serializeToString(result)).toEqual(xmlSerializer.serializeToString(doc));
  });

  it('Convert error handler to XML correctly', () => {
    const doc = domParser.parseFromString(
      `<camel><errorHandler><deadLetterChannel deadLetterUri="mock:dead"><redeliveryPolicy maximumRedeliveries="3" redeliveryDelay="250"/></deadLetterChannel></errorHandler></camel>`,
      'application/xml',
    );

    const entity = {
      type: 'errorHandler',
      errorHandlerDef: {
        deadLetterChannel: {
          deadLetterUri: 'mock:dead',
          redeliveryPolicy: { maximumRedeliveries: '3', redeliveryDelay: '250' },
        },
      },
    };

    const result = KaotoXmlSerializer.serialize([entity as unknown as CamelErrorHandlerVisualEntity]);
    expect(xmlSerializer.serializeToString(result)).toEqual(xmlSerializer.serializeToString(doc));
  });

  it('Convert beans ', () => {
    const doc = domParser.parseFromString(
      `<camel>
<beans>
  <bean name="test" type="bean" destroyMethod="destroy" factoryBean="ff" builderClass="com.example.MyBean">
    <properties>
      <property key="1" value="2"/>
    </properties>
  </bean>
</beans>
</camel>`,
      'application/xml',
    );

    const entity = {
      type: EntityType.Beans,
      parent: {
        beans: [
          {
            name: 'test',
            type: 'bean',
            destroyMethod: 'destroy',
            factoryBean: 'ff',
            builderClass: 'com.example.MyBean',
            properties: { 1: '2' },
          },
        ],
      },
    };

    const result = KaotoXmlSerializer.serialize([entity as unknown as BeansEntity]);
    expect(xmlSerializer.serializeToString(result)).toEqual(normalizeXml(xmlSerializer.serializeToString(doc)));
  });
});
