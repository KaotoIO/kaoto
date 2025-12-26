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

import { CamelCatalogService, CamelRouteVisualEntity, CatalogKind } from '../../../models';
import { EntityType } from '../../../models/camel/entities';
import { EntityOrderingService } from '../../../models/camel/entity-ordering.service';
import { CamelErrorHandlerVisualEntity } from '../../../models/visualization/flows/camel-error-handler-visual-entity';
import { BeansEntity } from '../../../models/visualization/metadata';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { EntityDefinition } from './entitiy-definition';
import { KaotoXmlSerializer } from './kaoto-xml-serializer';
import { normalizeXml } from './serializer-test-utils';

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
      `<camel xmlns="http://camel.apache.org/schema/spring"><route id="route-1"><from uri="direct:start"/><to uri="direct:end"/></route></camel>`,
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
      `<camel xmlns="http://camel.apache.org/schema/spring"><errorHandler><deadLetterChannel deadLetterUri="mock:dead"><redeliveryPolicy maximumRedeliveries="3" redeliveryDelay="250"/></deadLetterChannel></errorHandler></camel>`,
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
      `<camel xmlns="http://camel.apache.org/schema/spring">
<bean name="test" type="bean" destroyMethod="destroy" factoryBean="ff" builderClass="com.example.MyBean">
  <properties>
    <property key="1" value="2"/>
  </properties>
</bean>
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

  describe('Entity ordering in XML serialization', () => {
    it('should serialize entities in XML schema order', () => {
      const mixedEntities = [
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-1',
              from: { uri: 'direct:start', steps: [{ to: { uri: 'direct:end' } }] },
            },
          },
        },
        {
          type: EntityType.RestConfiguration,
          restConfigurationDef: {
            component: 'servlet',
            contextPath: '/api',
            port: '8080',
          },
        },
        {
          type: EntityType.Rest,
          restDef: {
            path: '/users',
          },
        },
        {
          type: EntityType.RouteConfiguration,
          entityDef: {
            id: 'myRouteConfig',
            errorHandler: { deadLetterChannel: { deadLetterUri: 'mock:error' } },
          },
        },
      ];

      const result = KaotoXmlSerializer.serialize(mixedEntities as EntityDefinition[]);
      const xmlString = xmlSerializer.serializeToString(result);
      const resultDoc = domParser.parseFromString(xmlString, 'application/xml');
      const children = Array.from(resultDoc.documentElement.children);

      expect(children[0].tagName).toBe('restConfiguration');
      expect(children[1].tagName).toBe('rest');
      expect(children[2].tagName).toBe('routeConfiguration');
      expect(children[3].tagName).toBe('route');
    });

    it('should preserve order within same entity types during serialization', () => {
      const multipleRoutes = [
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-3',
              from: { uri: 'direct:third', steps: [] },
            },
          },
        },
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-1',
              from: { uri: 'direct:first', steps: [] },
            },
          },
        },
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-2',
              from: { uri: 'direct:second', steps: [] },
            },
          },
        },
      ] as unknown as EntityDefinition[];

      const result = KaotoXmlSerializer.serialize(multipleRoutes);
      const xmlString = xmlSerializer.serializeToString(result);
      const resultDoc = domParser.parseFromString(xmlString, 'application/xml');
      const routeElements = Array.from(resultDoc.querySelectorAll('route'));

      expect(routeElements[0].getAttribute('id')).toBe('route-3');
      expect(routeElements[1].getAttribute('id')).toBe('route-1');
      expect(routeElements[2].getAttribute('id')).toBe('route-2');
    });

    it('should use EntityOrderingService for sorting entities', () => {
      const sortSpy = jest.spyOn(EntityOrderingService, 'sortEntitiesForSerialization');

      const entities = [
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'test-route',
              from: { uri: 'direct:start', steps: [] },
            },
          },
        },
      ] as unknown as EntityDefinition[];

      KaotoXmlSerializer.serialize(entities);

      expect(sortSpy).toHaveBeenCalledWith(entities);

      sortSpy.mockRestore();
    });

    it('should handle complex mixed entity ordering with preserved internal order', () => {
      const complexMixedEntities = [
        {
          type: EntityType.RouteConfiguration,
          entityDef: {
            id: 'config-2',
            errorHandler: { deadLetterChannel: { deadLetterUri: 'mock:error2' } },
          },
        },
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-1',
              from: { uri: 'direct:first', steps: [] },
            },
          },
        },
        {
          type: EntityType.RouteConfiguration,
          entityDef: {
            id: 'config-1',
            errorHandler: { deadLetterChannel: { deadLetterUri: 'mock:error1' } },
          },
        },
        {
          type: EntityType.RestConfiguration,
          restConfigurationDef: {
            component: 'servlet',
            port: '8080',
          },
        },
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'route-2',
              from: { uri: 'direct:second', steps: [] },
            },
          },
        },
      ] as unknown as EntityDefinition[];

      const result = KaotoXmlSerializer.serialize(complexMixedEntities);
      const xmlString = xmlSerializer.serializeToString(result);
      const resultDoc = domParser.parseFromString(xmlString, 'application/xml');
      const children = Array.from(resultDoc.documentElement.children);

      expect(children[0].tagName).toBe('restConfiguration');
      expect(children[1].tagName).toBe('routeConfiguration');
      expect(children[1].getAttribute('id')).toBe('config-2');
      expect(children[2].tagName).toBe('routeConfiguration');
      expect(children[2].getAttribute('id')).toBe('config-1');
      expect(children[3].tagName).toBe('route');
      expect(children[3].getAttribute('id')).toBe('route-1');
      expect(children[4].tagName).toBe('route');
      expect(children[4].getAttribute('id')).toBe('route-2');
    });

    it('should handle beans element placement correctly', () => {
      const entitiesWithBeans = [
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'test-route',
              from: { uri: 'direct:start', steps: [] },
            },
          },
        },
        {
          type: EntityType.Beans,
          parent: {
            beans: [
              {
                name: 'testBean',
                type: 'com.example.TestBean',
              },
            ],
          },
        },
        {
          type: EntityType.RestConfiguration,
          restConfigurationDef: {
            component: 'servlet',
          },
        },
      ] as unknown as EntityDefinition[];

      const result = KaotoXmlSerializer.serialize(entitiesWithBeans);
      const xmlString = xmlSerializer.serializeToString(result);
      const resultDoc = domParser.parseFromString(xmlString, 'application/xml');
      const children = Array.from(resultDoc.documentElement.children);

      expect(children[0].tagName).toBe('restConfiguration');
      expect(children[1].tagName).toBe('route');
      expect(children[2].tagName).toBe('bean');

      const beanElement = children[2];
      expect(beanElement.getAttribute('name')).toBe('testBean');
    });

    it('should maintain existing behavior for single entity types', () => {
      const singleRouteEntity = [
        {
          type: EntityType.Route,
          entityDef: {
            route: {
              id: 'single-route',
              from: { uri: 'direct:start', steps: [{ to: { uri: 'direct:end' } }] },
            },
          },
        },
      ];

      const result = KaotoXmlSerializer.serialize(singleRouteEntity as EntityDefinition[]);
      const xmlString = xmlSerializer.serializeToString(result);
      const resultDoc = domParser.parseFromString(xmlString, 'application/xml');

      expect(resultDoc.documentElement.tagName).toBe('camel');
      expect(resultDoc.querySelectorAll('route')).toHaveLength(1);
      expect(resultDoc.querySelector('route')?.getAttribute('id')).toBe('single-route');
    });
  });
});
