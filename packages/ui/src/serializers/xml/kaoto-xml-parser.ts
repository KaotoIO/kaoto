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

import { RouteXmlParser } from './parsers/route-xml-parser';
import { BeansXmlParser } from './parsers/beans-xml-parser';
import { RestXmlParser } from './parsers/rest-xml-parser';
import { BeanFactory } from '@kaoto/camel-catalog/types';
import { StepParser } from './parsers/step-parser';

export function isXML(code: unknown): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  const trimmedCode = code.trim();
  return trimmedCode.startsWith('<') && trimmedCode.endsWith('>');
}

export class KaotoXmlParser {
  static readonly PARSABLE_ELEMENTS = [
    'restConfiguration',
    'routeTemplate',
    'templatedRoute',
    'errorHandler',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onCompletion',
  ];

  routeXmlParser: RouteXmlParser;
  beanParser: BeansXmlParser;

  constructor() {
    this.routeXmlParser = new RouteXmlParser();
    this.beanParser = new BeansXmlParser();
  }

  parseXML(xml: string): unknown {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'application/xml');

    return this.parseFromXmlDocument(xmlDoc);
  }

  parseFromXmlDocument(xmlDoc: Document): unknown {
    const rawEntities: unknown[] = [];

    // Process route entities
    const routes = Array.from(xmlDoc.getElementsByTagName('route')).map((routeElement) =>
      RouteXmlParser.parse(routeElement),
    );

    if (routes.length > 0) {
      routes.forEach((r) => rawEntities.push({ route: r }));
    }

    // Process beans (bean factory)
    const beansSection = xmlDoc.getElementsByTagName('beans')[0];
    const beans: BeanFactory[] = beansSection ? this.beanParser.transformBeansSection(beansSection) : [];
    if (beans.length > 0) {
      rawEntities.push({ beans });
    }

    // Process rest entities
    const restEntities = Array.from(xmlDoc.getElementsByTagName('rest')).map((restElement) => ({
      rest: RestXmlParser.parse(restElement),
    }));

    if (restEntities.length > 0) {
      rawEntities.push(...restEntities);
    }

    // Process route configurations
    const routeConfigurations = Array.from(xmlDoc.getElementsByTagName('routeConfiguration')).map((routeConf) => ({
      routeConfiguration: RouteXmlParser.parseRouteConfiguration(routeConf),
    }));

    if (routeConfigurations.length > 0) {
      rawEntities.push(...routeConfigurations);
    }
    // rest of the elements
    const rootCamelElement = xmlDoc.getElementsByTagName('camel')[0];
    const children = rootCamelElement ? rootCamelElement.children : xmlDoc.children;
    Array.from(children).forEach((child) => {
      if (KaotoXmlParser.PARSABLE_ELEMENTS.includes(child.tagName)) {
        const entity = StepParser.parseElement(child);
        if (entity) {
          rawEntities.push({ [child.tagName]: entity });
        }
      }
    });

    return rawEntities;
  }
}
