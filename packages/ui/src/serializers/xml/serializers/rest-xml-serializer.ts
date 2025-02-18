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

import { StepXmlSerializer } from './step-xml-serializer';
import { Rest } from '@kaoto/camel-catalog/types';

export class RestXmlSerializer {
  private static readonly REST_ELEMENT_NAME = 'rest';
  private static readonly REST_VERBS = ['get', 'post', 'put', 'delete', 'patch', 'head'];
  //properties that are missing in the catalog (up to 4.9)
  private static readonly MISSING_PROPERTIES = ['param', 'security', 'responseMessage'];

  static serialize(rest: { [key: string]: unknown }, doc: Document): Element {
    const element = StepXmlSerializer.serialize(RestXmlSerializer.REST_ELEMENT_NAME, rest, doc);

    const restObject = rest as unknown as Rest;
    this.handleSecurityDefinitions(element, restObject, doc);

    this.REST_VERBS.forEach((verb) => {
      const verbKey = verb as keyof Rest;
      if (restObject[verbKey]) {
        (rest[verbKey] as { [key: string]: unknown }[]).forEach((verbInstance: { [key: string]: unknown }) => {
          const verbElement = StepXmlSerializer.serialize(verb, verbInstance, doc, element);
          this.handleMissingProperties(verbElement, verbInstance, doc);
          element.appendChild(verbElement);
        });
      }
    });

    return element;
  }
  private static handleMissingProperties(element: Element, rest: { [key: string]: unknown }, doc: Document) {
    for (const prop of this.MISSING_PROPERTIES) {
      if (!rest[prop] || this.containsMissingProperty(prop, element)) continue;
      (rest[prop] as unknown[]).forEach((propInstance) => {
        element.appendChild(
          StepXmlSerializer.serialize(prop, propInstance as { [key: string]: unknown }, doc, element),
        );
      });
    }
  }

  private static containsMissingProperty(prop: string, element: Element): boolean {
    return Array.from(element.children).filter((child) => child.tagName === prop).length > 0;
  }

  private static handleSecurityDefinitions(element: Element, rest: Rest, doc: Document) {
    if (!rest.securityDefinitions) return;

    let securityDefinitionsElement = element.getElementsByTagName('securityDefinitions')[0];
    if (!securityDefinitionsElement) {
      securityDefinitionsElement = doc.createElement('securityDefinitions');
    }

    Object.entries(rest.securityDefinitions).forEach(([key, value]) => {
      const securityElement = StepXmlSerializer.serialize(key, value as { [key: string]: unknown }, doc, element);
      console.log('securityElement', key, securityElement);

      if (securityElement) securityDefinitionsElement.appendChild(securityElement);
    });

    element.appendChild(securityDefinitionsElement);
  }
}
