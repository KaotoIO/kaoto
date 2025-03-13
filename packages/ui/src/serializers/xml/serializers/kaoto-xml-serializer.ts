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

import { EntityType } from '../../../models/camel/entities';
import { ElementType, StepXmlSerializer } from './step-xml-serializer';
import { RestXmlSerializer } from './rest-xml-serializer';
import { BeansXmlSerializer } from './beans-xml-serializer';
import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { EntityDefinition } from './entitiy-definition';

export class KaotoXmlSerializer {
  static serializeRoute(route: RouteDefinition, doc: Document): Element {
    const routeElement = StepXmlSerializer.serialize('route', route as unknown as { [key: string]: unknown }, doc);

    const steps = StepXmlSerializer.serializeSteps(route.from.steps as ElementType[], doc, routeElement);
    routeElement.append(...steps);

    return routeElement;
  }

  static serialize(entityDefinitions: EntityDefinition[]): Document {
    const parser = new DOMParser();
    const doc: XMLDocument = parser.parseFromString('<camel></camel>', 'text/xml');

    const rootElement = doc.documentElement;
    const beans = doc.createElement('beans');

    entityDefinitions.forEach((entity) => {
      const entityType = entity.type;

      switch (entity.type) {
        case EntityType.Beans:
          entity.parent.beans.forEach((bean) => {
            const beanElement = BeansXmlSerializer.serialize(bean, doc);
            if (beanElement) beans.appendChild(beanElement);
          });
          break;
        case EntityType.Route:
          {
            const routeElement = this.serializeRoute(entity.entityDef[EntityType.Route], doc);
            rootElement.appendChild(routeElement);
          }
          break;
        case EntityType.ErrorHandler:
          {
            const element = StepXmlSerializer.serialize(entityType, entity.errorHandlerDef, doc, rootElement);
            rootElement.appendChild(element);
          }
          break;
        case EntityType.Rest:
          rootElement.appendChild(RestXmlSerializer.serialize(entity.restDef, doc));
          break;

        case EntityType.RestConfiguration:
          {
            const element = StepXmlSerializer.serialize(entityType, entity.restConfigurationDef, doc, rootElement);
            rootElement.appendChild(element);
          }
          break;

        case EntityType.Intercept:
        case EntityType.InterceptFrom:
        case EntityType.InterceptSendToEndpoint:
        case EntityType.OnCompletion:
        case EntityType.RouteConfiguration:
        case EntityType.OnException: {
          const element = StepXmlSerializer.serialize(entityType, entity.entityDef, doc, rootElement);
          rootElement.appendChild(element);
        }
      }
    });

    if (beans.hasChildNodes()) rootElement.appendChild(beans);
    return doc;
  }
}
