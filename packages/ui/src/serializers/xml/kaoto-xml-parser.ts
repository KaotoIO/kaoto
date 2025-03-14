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
  static domParser = new DOMParser();
  routeXmlParser: RouteXmlParser;
  beanParser: BeansXmlParser;

  constructor() {
    this.routeXmlParser = new RouteXmlParser();
    this.beanParser = new BeansXmlParser();
  }

  parseXML(xml: string): unknown {
    try {
      const xmlDoc = KaotoXmlParser.domParser.parseFromString(xml, 'application/xml');
      return this.parseFromXmlDocument(xmlDoc);
    } catch (e) {
      console.log('Error parsing XML', e);
    }
  }

  parseFromXmlDocument(xmlDoc: Document): unknown {
    const rawEntities = [];
    const rootCamelElement = xmlDoc.getElementsByTagName('camel')[0];
    const children = rootCamelElement ? rootCamelElement.children : xmlDoc.children;

    // Process route entities
    Array.from(xmlDoc.getElementsByTagName('route')).forEach((routeElement) => {
      const route = RouteXmlParser.parse(routeElement);
      rawEntities.push({ route });
    });

    // Process beans (bean factory)
    const beansSection = xmlDoc.getElementsByTagName('beans')[0];
    const beans: BeanFactory[] = beansSection ? this.beanParser.transformBeansSection(beansSection) : [];
    // process beans outside of beans section
    Array.from(children)
      .filter((child) => child.tagName === 'bean')
      .forEach((beanElement) => {
        beans.push(BeansXmlParser.transformBeanFactory(beanElement));
      });

    if (beans.length > 0) {
      rawEntities.push({ beans });
    }

    // Process rest entities
    Array.from(xmlDoc.getElementsByTagName('rest')).forEach((restElement) => {
      const rest = RestXmlParser.parse(restElement);
      rawEntities.push({ rest });
    });

    // Process route configurations
    Array.from(xmlDoc.getElementsByTagName('routeConfiguration')).forEach((routeConf) => {
      const routeConfiguration = RouteXmlParser.parseRouteConfiguration(routeConf);
      rawEntities.push({ routeConfiguration });
    });

    // rest of the elements

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
