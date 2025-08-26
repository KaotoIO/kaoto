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

export class EntityOrderingService {
  /**
   * XML Schema order for serialization - follows the Camel XML schema requirements
   * Based on: restConfiguration, rest, routeConfiguration, routeTemplate, templatedRoute, route
   */
  static readonly XML_SCHEMA_ORDER = [
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
  ];

  /**
   * Runtime priority entities that should be added at the beginning of the entity list
   * This preserves the existing behavior for error handling entities
   */
  static readonly RUNTIME_PRIORITY_ENTITIES = [
    EntityType.OnException,
    EntityType.ErrorHandler,
    EntityType.OnCompletion,
  ];

  /**
   * Sorts entities for XML serialization following the XML schema order while preserving
   * the original order within each entity type group
   */
  static sortEntitiesForSerialization<T extends { type: EntityType }>(entities: T[]): T[] {
    const entitiesByType = new Map<EntityType, T[]>();

    entities.forEach((entity) => {
      const key = entity.type;
      if (!entitiesByType.has(key)) {
        entitiesByType.set(key, []);
      }
      entitiesByType.get(key)!.push(entity);
    });

    const result: T[] = [];

    EntityOrderingService.XML_SCHEMA_ORDER.forEach((entityType) => {
      const entitiesOfType = entitiesByType.get(entityType);
      if (entitiesOfType) {
        result.push(...entitiesOfType);
      }
    });

    entitiesByType.forEach((entitiesOfType, entityType) => {
      if (!EntityOrderingService.XML_SCHEMA_ORDER.includes(entityType)) {
        result.push(...entitiesOfType);
      }
    });

    return result;
  }

  /**
   * Checks if an entity type should be given priority during runtime insertion
   */
  static isRuntimePriorityEntity(entityType: EntityType): boolean {
    return EntityOrderingService.RUNTIME_PRIORITY_ENTITIES.includes(entityType);
  }

  /**
   * Gets the XML schema order index for an entity type
   * Returns -1 if the entity type is not in the schema order
   */
  static getXmlSchemaOrderIndex(entityType: EntityType): number {
    return EntityOrderingService.XML_SCHEMA_ORDER.indexOf(entityType);
  }
}
