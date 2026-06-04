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

import { RouteDefinition } from '@kaoto/camel-catalog/types';

import { EntityOrderingService } from '../../../models/camel/entity-ordering.service';
import { EntityType } from '../../../models/entities';
import { BeansXmlSerializer } from './beans-xml-serializer';
import { EntityDefinition } from './entitiy-definition';
import { RestXmlSerializer } from './rest-xml-serializer';
import { ElementType, StepXmlSerializer } from './step-xml-serializer';

export class KaotoXmlSerializer {
  static async serializeRoute(route: RouteDefinition, doc: Document): Promise<Element> {
    const routeElement = await StepXmlSerializer.serialize(
      'route',
      route as unknown as { [key: string]: unknown },
      doc,
    );

    const steps = await StepXmlSerializer.serializeSteps(route.from.steps as ElementType[], doc, routeElement);
    routeElement.append(...steps);

    return routeElement;
  }

  static async serialize(
    entityDefinitions: EntityDefinition[],
    rootElementDefinitions?: { name: string; value: string }[],
  ): Promise<Document> {
    const parser = new DOMParser();
    const doc: XMLDocument = parser.parseFromString('<camel></camel>', 'text/xml');
    const rootElement = doc.documentElement;

    if (rootElementDefinitions && rootElementDefinitions.length > 0) {
      rootElementDefinitions.forEach((rootElementDef) => {
        rootElement.setAttribute(rootElementDef.name, rootElementDef.value);
      });
    } else {
      rootElement.setAttribute('xmlns', 'http://camel.apache.org/schema/spring');
    }

    const sortedEntities = EntityOrderingService.sortEntitiesForSerialization(entityDefinitions);

    for (const entity of sortedEntities) {
      const entityType = entity.type;

      switch (entity.type) {
        case EntityType.Beans:
          for (const bean of entity.parent.beans) {
            const beanElement = await BeansXmlSerializer.serialize(bean, doc);
            if (beanElement) rootElement.appendChild(beanElement);
          }
          break;
        case EntityType.Route:
          {
            const routeElement = await this.serializeRoute(entity.entityDef[EntityType.Route], doc);
            rootElement.appendChild(routeElement);
          }
          break;
        case EntityType.ErrorHandler:
          {
            const element = await StepXmlSerializer.serialize(entityType, entity.errorHandlerDef, doc, rootElement);
            rootElement.appendChild(element);
          }
          break;
        case EntityType.Rest:
          {
            const restElement = await RestXmlSerializer.serialize(entity.restDef, doc);
            rootElement.appendChild(restElement);
          }
          break;

        case EntityType.RestConfiguration:
          {
            const element = await StepXmlSerializer.serialize(
              entityType,
              entity.restConfigurationDef,
              doc,
              rootElement,
            );
            rootElement.appendChild(element);
          }
          break;

        case EntityType.Intercept:
        case EntityType.InterceptFrom:
        case EntityType.InterceptSendToEndpoint:
        case EntityType.OnCompletion:
        case EntityType.RouteConfiguration:
        case EntityType.OnException: {
          const element = await StepXmlSerializer.serialize(entityType, entity.entityDef, doc, rootElement);
          rootElement.appendChild(element);
        }
      }
    }

    return doc;
  }
}
