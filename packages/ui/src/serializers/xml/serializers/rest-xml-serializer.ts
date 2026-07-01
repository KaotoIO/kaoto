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

import { Rest } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../../models';
import { REST_DSL_VERBS, REST_ELEMENT_NAME } from '../../../models/special-processors.constants';
import { StepXmlSerializer } from './step-xml-serializer';

export class RestXmlSerializer {
  //properties that are missing in the catalog (up to 4.9)
  private static readonly MISSING_PROPERTIES = ['param', 'security', 'responseMessage'];

  static async serialize(rest: { [key: string]: unknown }, doc: Document): Promise<Element> {
    const element = await StepXmlSerializer.serialize(REST_ELEMENT_NAME, rest, doc);

    let restObject = rest as unknown as Rest;
    if (rest.rest) restObject = rest.rest as unknown as Rest;

    await this.handleSecurityDefinitions(element, restObject, doc);

    for (const verb of REST_DSL_VERBS) {
      const verbKey = verb as keyof Rest;
      if (restObject[verbKey]) {
        for (const verbInstance of restObject[verbKey] as { [key: string]: unknown }[]) {
          const verbElement = await StepXmlSerializer.serialize(verb, verbInstance, doc, element);
          await this.handleMissingProperties(verbElement, verbInstance, doc);
          element.appendChild(verbElement);
        }
      }
    }

    return element;
  }

  private static async handleMissingProperties(element: Element, rest: { [key: string]: unknown }, doc: Document) {
    for (const prop of this.MISSING_PROPERTIES) {
      if (!rest[prop] || this.containsMissingProperty(prop, element)) continue;
      // if the property is in catalog, it's already handled by step serializer
      const propDefinition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, prop);
      if (propDefinition?.properties[prop]) continue;

      for (const propInstance of rest[prop] as unknown[]) {
        element.appendChild(
          await StepXmlSerializer.serialize(prop, propInstance as { [key: string]: unknown }, doc, element),
        );
      }
    }
  }

  private static containsMissingProperty(prop: string, element: Element): boolean {
    return Array.from(element.children).some((child) => child.tagName === prop);
  }

  private static async handleSecurityDefinitions(element: Element, rest: Rest, doc: Document) {
    if (!rest.securityDefinitions) return;

    let securityDefinitionsElement = element.getElementsByTagName('securityDefinitions')[0];
    if (!securityDefinitionsElement) {
      securityDefinitionsElement = doc.createElement('securityDefinitions');
    }

    for (const [key, value] of Object.entries(rest.securityDefinitions)) {
      const securityElement = await StepXmlSerializer.serialize(key, value as { [key: string]: unknown }, doc, element);

      if (securityElement) securityDefinitionsElement.appendChild(securityElement);
    }

    element.appendChild(securityDefinitionsElement);
  }
}
