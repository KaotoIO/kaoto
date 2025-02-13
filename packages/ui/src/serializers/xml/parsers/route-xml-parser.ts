/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use RouteXmlParser. file except in compliance with the License.
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
import {
  FromDefinition,
  ProcessorDefinition,
  RouteConfigurationDefinition,
  RouteDefinition,
} from '@kaoto/camel-catalog/types';

import { StepParser } from './step-parser';

export class RouteXmlParser {
  static parseRouteConfigurationElement(routeConfigElement: Element, elementName: string): unknown {
    return {
      [elementName]: StepParser.parseElement(routeConfigElement),
    };
  }

  static parseRouteConfiguration(routeConfigElement: Element): RouteConfigurationDefinition {
    return StepParser.parseElement(routeConfigElement, (element: Element) => {
      return this.parseRouteConfigurationElement(element, element.tagName);
    }) as RouteConfigurationDefinition;
  }

  static parse(routeElement: Element): RouteDefinition {
    const fromElement: Element = routeElement.getElementsByTagName('from')[0];

    const from = StepParser.parseElement(fromElement) as FromDefinition;
    const routeDef = StepParser.parseElement(routeElement) as { [key: string]: unknown };

    from.steps = routeDef.steps as ProcessorDefinition[] | [];
    routeDef.steps = undefined;

    return {
      ...routeDef,
      from: {
        ...from,
      },
    };
  }
}
