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
    EntityType.ErrorHandler,
    EntityType.OnException,
    EntityType.OnCompletion,
    EntityType.Intercept,
    EntityType.InterceptFrom,
    EntityType.InterceptSendToEndpoint,
    EntityType.RouteConfiguration,
    EntityType.Route,
    EntityType.Beans,
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
   * Gets the XML schema order index for an entity type
   * Returns -1 if the entity type is not in the schema order
   */
  static getXmlSchemaOrderIndex(entityType: EntityType): number {
    return EntityOrderingService.XML_SCHEMA_ORDER.indexOf(entityType);
  }

  /**
   * Finds the correct insertion index for a new entity in an existing array
   * Maintains XML schema order while preserving relative order within same type
   *
   * @param entities - Current array of entities
   * @param newEntityType - Type of entity to insert
   * @returns Index where the new entity should be inserted
   *
   * @example
   * XML_SCHEMA_ORDER: RestConfiguration, Rest, ErrorHandler, OnException, OnCompletion,
   *                   Intercept, InterceptFrom, InterceptSendToEndpoint, RouteConfiguration, Route, Beans
   *
   * If entities = [Route, Route] and adding OnException (which comes BEFORE Route in schema)
   * Returns 0 (insert before all Routes)
   *
   * If entities = [OnException, Route] and adding RouteConfiguration (which comes BEFORE Route but AFTER OnException)
   * Returns 1 (insert between OnException and Route)
   *
   * If entities = [OnException, Route] and adding Beans (which comes AFTER Route in schema)
   * Returns 2 (insert after all Routes)
   */
  static findInsertionIndex<T extends { type: EntityType }>(entities: T[], newEntityType: EntityType): number {
    const newEntityOrderIndex = EntityOrderingService.getXmlSchemaOrderIndex(newEntityType);

    // If entity type is not in schema order, append at the end
    if (newEntityOrderIndex === -1) {
      return entities.length;
    }

    // Find the correct position by scanning through entities
    for (let i = 0; i < entities.length; i++) {
      const currentEntityOrderIndex = EntityOrderingService.getXmlSchemaOrderIndex(entities[i].type);

      // If current entity is not in schema order, continue
      if (currentEntityOrderIndex === -1) {
        continue;
      }

      // If we found an entity that should come AFTER the new entity,
      // insert before it
      if (currentEntityOrderIndex > newEntityOrderIndex) {
        return i;
      }
    }

    // If we didn't find any entity that should come after, append at the end
    return entities.length;
  }
}
