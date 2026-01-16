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

import { EntityType } from './entities';
import { EntityOrderingService } from './entity-ordering.service';

describe('EntityOrderingService', () => {
  it('should define the correct XML schema order', () => {
    expect(EntityOrderingService.XML_SCHEMA_ORDER).toEqual([
      EntityType.RestConfiguration,
      EntityType.Rest,
      EntityType.ErrorHandler,
      EntityType.OnException,
      EntityType.OnCompletion,
      EntityType.Intercept,
      EntityType.InterceptFrom,
      EntityType.InterceptSendToEndpoint,
      EntityType.RouteConfiguration,
      EntityType.Route,
      EntityType.Beans,
    ]);
  });

  describe('sortEntitiesForSerialization', () => {
    it('should sort entities according to XML schema order', () => {
      const entities = [
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
        { type: EntityType.Rest, id: 'rest1' },
        { type: EntityType.RouteConfiguration, id: 'routeConfig1' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toHaveLength(4);
      expect(sorted[0]).toEqual({ type: EntityType.RestConfiguration, id: 'restConfig1' });
      expect(sorted[1]).toEqual({ type: EntityType.Rest, id: 'rest1' });
      expect(sorted[2]).toEqual({ type: EntityType.RouteConfiguration, id: 'routeConfig1' });
      expect(sorted[3]).toEqual({ type: EntityType.Route, id: 'route1' });
    });

    it('should preserve order within same entity types', () => {
      const entities = [
        { type: EntityType.Route, id: 'route3' },
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.Route, id: 'route2' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toHaveLength(3);
      expect(sorted[0]).toEqual({ type: EntityType.Route, id: 'route3' });
      expect(sorted[1]).toEqual({ type: EntityType.Route, id: 'route1' });
      expect(sorted[2]).toEqual({ type: EntityType.Route, id: 'route2' });
    });

    it('should handle mixed entity types with preserved internal order', () => {
      const entities = [
        { type: EntityType.RouteConfiguration, id: 'config2' },
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.RouteConfiguration, id: 'config1' },
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
        { type: EntityType.Route, id: 'route2' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toHaveLength(5);
      expect(sorted[0]).toEqual({ type: EntityType.RestConfiguration, id: 'restConfig1' });

      expect(sorted[1]).toEqual({ type: EntityType.RouteConfiguration, id: 'config2' });
      expect(sorted[2]).toEqual({ type: EntityType.RouteConfiguration, id: 'config1' });

      expect(sorted[3]).toEqual({ type: EntityType.Route, id: 'route1' });
      expect(sorted[4]).toEqual({ type: EntityType.Route, id: 'route2' });
    });

    it('should handle entities not in XML_SCHEMA_ORDER', () => {
      const entities = [
        { type: EntityType.Route, id: 'route1' },
        { type: 'unknownType' as EntityType, id: 'unknown1' },
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toHaveLength(3);

      expect(sorted[0]).toEqual({ type: EntityType.RestConfiguration, id: 'restConfig1' });
      expect(sorted[1]).toEqual({ type: EntityType.Route, id: 'route1' });

      expect(sorted[2]).toEqual({ type: 'unknownType', id: 'unknown1' });
    });

    it('should handle empty array', () => {
      const entities: { type: EntityType; id: string }[] = [];
      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toEqual([]);
    });

    it('should handle single entity', () => {
      const entities = [{ type: EntityType.Route, id: 'route1' }];
      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toEqual([{ type: EntityType.Route, id: 'route1' }]);
    });

    it('should handle all entity types in XML schema order', () => {
      const entities = EntityOrderingService.XML_SCHEMA_ORDER.map((type, index) => ({
        type,
        id: `entity${index}`,
      })).reverse();

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      expect(sorted).toHaveLength(EntityOrderingService.XML_SCHEMA_ORDER.length);

      sorted.forEach((entity, index) => {
        expect(entity.type).toBe(EntityOrderingService.XML_SCHEMA_ORDER[index]);
      });
    });
  });

  describe('getXmlSchemaOrderIndex', () => {
    it('should return correct index for entities in XML schema order', () => {
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.RestConfiguration)).toBe(0);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Rest)).toBe(1);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.ErrorHandler)).toBe(2);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.OnException)).toBe(3);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.OnCompletion)).toBe(4);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Intercept)).toBe(5);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.InterceptFrom)).toBe(6);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.InterceptSendToEndpoint)).toBe(7);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.RouteConfiguration)).toBe(8);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Route)).toBe(9);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Beans)).toBe(10);
    });

    it('should return -1 for entities not in XML schema order', () => {
      expect(EntityOrderingService.getXmlSchemaOrderIndex('unknownType' as EntityType)).toBe(-1);
    });

    it('should handle all entities in XML_SCHEMA_ORDER', () => {
      EntityOrderingService.XML_SCHEMA_ORDER.forEach((entityType, expectedIndex) => {
        expect(EntityOrderingService.getXmlSchemaOrderIndex(entityType)).toBe(expectedIndex);
      });
    });
  });

  describe('findInsertionIndex', () => {
    it('should insert at the end when array is empty', () => {
      const entities: { type: EntityType; id: string }[] = [];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.Route);

      expect(index).toBe(0);
    });

    it('should insert OnException before Route', () => {
      const entities = [{ type: EntityType.Route, id: 'route1' }];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.OnException);

      expect(index).toBe(0);
    });

    it('should insert Route after OnException', () => {
      const entities = [{ type: EntityType.OnException, id: 'onException1' }];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.Route);

      expect(index).toBe(1);
    });

    it('should insert Beans at the end after Route', () => {
      const entities = [
        { type: EntityType.OnException, id: 'onException1' },
        { type: EntityType.Route, id: 'route1' },
      ];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.Beans);

      expect(index).toBe(2);
    });

    it('should insert RouteConfiguration between OnException and Route', () => {
      const entities = [
        { type: EntityType.OnException, id: 'onException1' },
        { type: EntityType.Route, id: 'route1' },
      ];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.RouteConfiguration);

      expect(index).toBe(1);
    });

    it('should insert RestConfiguration at the beginning', () => {
      const entities = [
        { type: EntityType.OnException, id: 'onException1' },
        { type: EntityType.Route, id: 'route1' },
      ];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.RestConfiguration);

      expect(index).toBe(0);
    });

    it('should insert after entities of the same type', () => {
      const entities = [
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.Route, id: 'route2' },
      ];
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.Route);

      expect(index).toBe(2);
    });

    it('should handle complex mixed entity types', () => {
      const entities = [
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
        { type: EntityType.ErrorHandler, id: 'errorHandler1' },
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.Route, id: 'route2' },
      ];

      // Insert OnException (should go after ErrorHandler, before Route)
      const onExceptionIndex = EntityOrderingService.findInsertionIndex(entities, EntityType.OnException);
      expect(onExceptionIndex).toBe(2);

      // Insert Rest (should go after RestConfiguration, before ErrorHandler)
      const restIndex = EntityOrderingService.findInsertionIndex(entities, EntityType.Rest);
      expect(restIndex).toBe(1);

      // Insert Beans (should go at the end)
      const beansIndex = EntityOrderingService.findInsertionIndex(entities, EntityType.Beans);
      expect(beansIndex).toBe(4);
    });

    it('should insert unknown entity types at the end', () => {
      const entities = [
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.Beans, id: 'beans1' },
      ];
      const index = EntityOrderingService.findInsertionIndex(entities, 'unknownType' as EntityType);

      expect(index).toBe(2);
    });

    it('should handle entities not in schema order gracefully', () => {
      const entities = [
        { type: 'unknownType1' as EntityType, id: 'unknown1' },
        { type: EntityType.Route, id: 'route1' },
        { type: 'unknownType2' as EntityType, id: 'unknown2' },
      ];

      // Insert OnException (should go before Route)
      const index = EntityOrderingService.findInsertionIndex(entities, EntityType.OnException);
      expect(index).toBe(1);
    });

    it('should maintain correct order for all entity types', () => {
      const entities: { type: EntityType; id: string }[] = [];

      // Add entities in reverse order and verify each insertion index
      const typesToAdd = [
        EntityType.Beans,
        EntityType.Route,
        EntityType.RouteConfiguration,
        EntityType.InterceptSendToEndpoint,
        EntityType.InterceptFrom,
        EntityType.Intercept,
        EntityType.OnCompletion,
        EntityType.OnException,
        EntityType.ErrorHandler,
        EntityType.Rest,
        EntityType.RestConfiguration,
      ];

      typesToAdd.forEach((type, i) => {
        const index = EntityOrderingService.findInsertionIndex(entities, type);
        entities.splice(index, 0, { type, id: `entity${i}` });
      });

      // Verify final order matches XML_SCHEMA_ORDER
      entities.forEach((entity, index) => {
        expect(entity.type).toBe(EntityOrderingService.XML_SCHEMA_ORDER[index]);
      });
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between XML schema order and sorting', () => {
      const entities = [
        { type: EntityType.Beans, id: 'beans1' },
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
        { type: EntityType.OnException, id: 'onException1' },
        { type: EntityType.Rest, id: 'rest1' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      for (let i = 0; i < sorted.length - 1; i++) {
        const currentIndex = EntityOrderingService.getXmlSchemaOrderIndex(sorted[i].type);
        const nextIndex = EntityOrderingService.getXmlSchemaOrderIndex(sorted[i + 1].type);

        // Current entity should have lower or equal index than next (equal for unknown types)
        if (currentIndex !== -1 && nextIndex !== -1) {
          expect(currentIndex).toBeLessThanOrEqual(nextIndex);
        }
      }
    });

    it('should produce same order using findInsertionIndex as sortEntitiesForSerialization', () => {
      const originalEntities = [
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.OnException, id: 'onException1' },
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
        { type: EntityType.Beans, id: 'beans1' },
        { type: EntityType.Rest, id: 'rest1' },
      ];

      // Sort using sortEntitiesForSerialization
      const sorted = EntityOrderingService.sortEntitiesForSerialization([...originalEntities]);

      // Build using findInsertionIndex
      const built: typeof originalEntities = [];
      originalEntities.forEach((entity) => {
        const index = EntityOrderingService.findInsertionIndex(built, entity.type);
        built.splice(index, 0, entity);
      });

      // Both should produce the same order
      expect(built).toEqual(sorted);
    });
  });
});
