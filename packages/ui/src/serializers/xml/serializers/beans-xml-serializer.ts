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

import { BeanFactory } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../../../models';
import { ElementType, StepXmlSerializer } from './step-xml-serializer';

export class BeansXmlSerializer {
  static serialize(beanElement: BeanFactory, doc: Document): Element | undefined {
    const bean = doc.createElement('bean');
    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, 'beanFactory')?.properties;
    if (!properties) return undefined;

    StepXmlSerializer.serializeObjectProperties(bean, doc, beanElement as unknown as ElementType, properties);

    if (beanElement['constructors']) {
      bean.appendChild(this.serializeConstructors(beanElement['constructors'], doc));
    }

    if (beanElement['properties']) {
      bean.appendChild(this.serializeProperties(beanElement['properties'], doc));
    }
    return bean;
  }

  static serializeConstructors(constructors: unknown, doc: Document): Element {
    const constructorsElement = doc.createElement('constructors');
    for (const [key, value] of Object.entries(constructors as { [key: string]: string })) {
      const constructorElement = doc.createElement('constructor');
      constructorElement.setAttribute('index', key);
      // with undefined I went with the empty string instead of omit the element to keep the index
      constructorElement.setAttribute('value', value ?? '');
      constructorsElement.appendChild(constructorElement);
    }

    return constructorsElement;
  }

  static serializeProperties(properties: unknown, doc: Document) {
    const propertiesElement = doc.createElement('properties');

    for (const [propKey, propValue] of Object.entries(properties as { [key: string]: unknown })) {
      if (propValue === undefined) continue;

      if (typeof propValue === 'object') {
        const flattened = this.flattenObject(propValue as Record<string, unknown>, propKey);

        for (const { key, value } of flattened) {
          if (value === undefined) continue;
          this.appendPropertyElement(doc, propertiesElement, key, value);
        }
      } else {
        this.appendPropertyElement(doc, propertiesElement, propKey, String(propValue));
      }
    }
    return propertiesElement;
  }

  private static appendPropertyElement(doc: Document, propertiesElement: Element, key: string, value: string) {
    const propertyElement = doc.createElement('property');
    propertyElement.setAttribute('key', key);
    propertyElement.setAttribute('value', value);
    propertiesElement.appendChild(propertyElement);
  }

  // Flatten nested objects to a single level e.g {a: {b: {c: 'value'}}} => [{key: 'a.b.c', value: 'value'}]
  private static flattenObject(obj: Record<string, unknown>, prefix = ''): { key: string; value: string }[] {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        if (value === undefined) return acc;

        if (typeof value === 'object') {
          return acc.concat(this.flattenObject(value as Record<string, unknown>, `${prefix}.${key}`));
        }
        return acc.concat(acc, { key: `${prefix}.${key}`, value: String(value) });
      },
      [] as { key: string; value: string }[],
    );
  }
}
