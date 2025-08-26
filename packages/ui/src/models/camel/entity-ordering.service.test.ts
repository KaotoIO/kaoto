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
  describe('XML_SCHEMA_ORDER', () => {
    it('should define the correct XML schema order', () => {
      expect(EntityOrderingService.XML_SCHEMA_ORDER).toEqual([
        EntityType.RestConfiguration,
        EntityType.Rest,
        EntityType.RouteConfiguration,
        EntityType.Route,
        EntityType.ErrorHandler,
        EntityType.OnException,
        EntityType.OnCompletion,
        EntityType.Intercept,
        EntityType.InterceptFrom,
        EntityType.InterceptSendToEndpoint,
        EntityType.Beans,
      ]);
    });

    it('should include all common entity types', () => {
      const schemaOrder = EntityOrderingService.XML_SCHEMA_ORDER;

      expect(schemaOrder).toContain(EntityType.RestConfiguration);
      expect(schemaOrder).toContain(EntityType.Rest);
      expect(schemaOrder).toContain(EntityType.RouteConfiguration);
      expect(schemaOrder).toContain(EntityType.Route);
      expect(schemaOrder).toContain(EntityType.ErrorHandler);
      expect(schemaOrder).toContain(EntityType.Beans);
    });

    it('should have RestConfiguration before Rest', () => {
      const schemaOrder = EntityOrderingService.XML_SCHEMA_ORDER;
      const restConfigIndex = schemaOrder.indexOf(EntityType.RestConfiguration);
      const restIndex = schemaOrder.indexOf(EntityType.Rest);

      expect(restConfigIndex).toBeLessThan(restIndex);
    });

    it('should have RouteConfiguration before Route', () => {
      const schemaOrder = EntityOrderingService.XML_SCHEMA_ORDER;
      const routeConfigIndex = schemaOrder.indexOf(EntityType.RouteConfiguration);
      const routeIndex = schemaOrder.indexOf(EntityType.Route);

      expect(routeConfigIndex).toBeLessThan(routeIndex);
    });
  });

  describe('RUNTIME_PRIORITY_ENTITIES', () => {
    it('should define the correct runtime priority entities', () => {
      expect(EntityOrderingService.RUNTIME_PRIORITY_ENTITIES).toEqual([
        EntityType.OnException,
        EntityType.ErrorHandler,
        EntityType.OnCompletion,
      ]);
    });

    it('should only include error handling entities', () => {
      const priorityEntities = EntityOrderingService.RUNTIME_PRIORITY_ENTITIES;

      expect(priorityEntities).toContain(EntityType.OnException);
      expect(priorityEntities).toContain(EntityType.ErrorHandler);
      expect(priorityEntities).toContain(EntityType.OnCompletion);

      expect(priorityEntities).not.toContain(EntityType.Route);
      expect(priorityEntities).not.toContain(EntityType.RestConfiguration);
      expect(priorityEntities).not.toContain(EntityType.Rest);
    });
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

  describe('isRuntimePriorityEntity', () => {
    it('should return true for priority entities', () => {
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.OnException)).toBe(true);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.ErrorHandler)).toBe(true);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.OnCompletion)).toBe(true);
    });

    it('should return false for non-priority entities', () => {
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.Route)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.RestConfiguration)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.Rest)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.RouteConfiguration)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.Intercept)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.InterceptFrom)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.InterceptSendToEndpoint)).toBe(false);
      expect(EntityOrderingService.isRuntimePriorityEntity(EntityType.Beans)).toBe(false);
    });

    it('should handle all priority entities from RUNTIME_PRIORITY_ENTITIES array', () => {
      EntityOrderingService.RUNTIME_PRIORITY_ENTITIES.forEach((entityType) => {
        expect(EntityOrderingService.isRuntimePriorityEntity(entityType)).toBe(true);
      });
    });
  });

  describe('getXmlSchemaOrderIndex', () => {
    it('should return correct index for entities in XML schema order', () => {
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.RestConfiguration)).toBe(0);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Rest)).toBe(1);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.RouteConfiguration)).toBe(2);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Route)).toBe(3);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.ErrorHandler)).toBe(4);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.OnException)).toBe(5);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.OnCompletion)).toBe(6);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.Intercept)).toBe(7);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.InterceptFrom)).toBe(8);
      expect(EntityOrderingService.getXmlSchemaOrderIndex(EntityType.InterceptSendToEndpoint)).toBe(9);
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

    it('should properly separate priority entities from XML schema ordering', () => {
      // Priority entities are used for runtime insertion, not XML serialization ordering
      const priorityEntities = EntityOrderingService.RUNTIME_PRIORITY_ENTITIES;
      const xmlSchemaOrder = EntityOrderingService.XML_SCHEMA_ORDER;

      // All priority entities should also exist in XML schema order
      priorityEntities.forEach((priorityEntity) => {
        expect(xmlSchemaOrder).toContain(priorityEntity);
      });

      // Priority entities should not affect XML serialization order
      const entities = [
        { type: EntityType.Route, id: 'route1' },
        { type: EntityType.OnException, id: 'onException1' }, // Priority entity
        { type: EntityType.RestConfiguration, id: 'restConfig1' },
      ];

      const sorted = EntityOrderingService.sortEntitiesForSerialization(entities);

      // Should follow XML schema order, not priority order
      expect(sorted[0]).toEqual({ type: EntityType.RestConfiguration, id: 'restConfig1' });
      expect(sorted[1]).toEqual({ type: EntityType.Route, id: 'route1' });
      expect(sorted[2]).toEqual({ type: EntityType.OnException, id: 'onException1' });
    });
  });
});
