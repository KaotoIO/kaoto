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

import { CamelCatalogService, CatalogKind, ICamelProcessorProperty } from '../../../models';
import { ARRAY_TYPE_NAMES, PROCESSOR_NAMES } from '../xml-utils';
import { ExpressionXmlSerializer } from './expression-xml-serializer';
import { CamelComponentSchemaService } from '../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelUriHelper, ParsedParameters } from '../../../utils';
import { DoTry } from '@kaoto/camel-catalog/types';

export type ElementType = { [key: string]: unknown; steps?: ElementType[] };

export class StepXmlSerializer {
  static serializeObjectProperties(
    element: Element,
    doc: Document,
    processor: ElementType,
    properties: Record<string, ICamelProcessorProperty>,
    routeParent?: Element,
  ) {
    for (const [key, props] of Object.entries(properties)) {
      switch (props.kind) {
        case 'value':
          element.textContent = processor as unknown as string;
          break;

        case 'attribute':
          this.serializeAttribute(element, key, processor, processor[key]);
          break;

        case 'expression':
          ExpressionXmlSerializer.serialize(key, processor[key], doc, element, routeParent);
          break;

        case 'element':
          this.serializeElementType(element, key, processor, props, doc, routeParent);
          break;
      }
    }
  }

  static serialize(elementName: string, obj: ElementType, doc: Document, parent?: Element): Element {
    const element = doc.createElement(elementName);

    //unidentified might be when a new element is added from the form
    if (!obj) return element;
    if (obj[elementName]) {
      // for cases like errorHandler, intercept in the route configuration etc where the element is nested i.e intercept:{intercept:{...}}
      obj = obj[elementName] as ElementType;
    }
    const routeParent = elementName === 'route' ? element : parent;
    const properties = CamelCatalogService.getComponent(
      CatalogKind.Processor,
      PROCESSOR_NAMES.get(elementName) ?? elementName,
    )?.properties;

    if (!properties) {
      this.serializeUnknownType(element, obj, doc, routeParent);
      return element;
    }

    const processor = obj as ElementType;
    this.serializeObjectProperties(element, doc, processor, properties, routeParent);

    if (elementName === 'doTry') {
      this.decorateDoTry(obj as DoTry, element, doc);
    }

    return element;
  }

  private static serializeUnknownType(element: Element, obj: ElementType, doc: Document, routeParent?: Element) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        const childElement = this.serialize(key, value as ElementType, doc, routeParent);
        element.appendChild(childElement);
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }

  private static serializeElementType(
    element: Element,
    key: string,
    processor: ElementType,
    properties: ICamelProcessorProperty,
    doc: Document,
    routeParent?: Element,
  ) {
    // skip serialization of map types usually they are handled differently
    if (properties.javaType.includes('java.util.Map')) return;
    if (properties.type === 'array') {
      this.serializeArrayType(element, key, processor, properties, doc, routeParent);
    } else {
      this.serializeObjectType(element, key, processor, properties, doc, routeParent);
    }
  }

  private static serializeArrayType(
    element: Element,
    key: string,
    processor: ElementType,
    props: ICamelProcessorProperty,
    doc: Document,
    routeParent?: Element,
  ) {
    if (key === 'outputs' && processor['steps']) {
      const steps = this.serializeSteps(processor['steps'], doc, routeParent);
      element.append(...steps);
      return;
    }
    const value = processor[key];
    if (!Array.isArray(value) || value.length === 0) return;

    //handle special case like allowableValues
    const childName = ARRAY_TYPE_NAMES.get(key) ?? key;
    const isStringList = props.javaType === 'java.util.List<java.lang.String>';

    const children = (value as ElementType[]).map((v) => {
      let childElement;
      if (isStringList) {
        childElement = doc.createElement(childName);
        childElement.textContent = v as unknown as string;
        return childElement;
      }

      return this.serialize(childName, v, doc, routeParent);
    });

    //  Append children based on naming convention
    if (childName !== key) {
      const arrayElement = doc.createElement(key);
      arrayElement.append(...children);
      element.appendChild(arrayElement);
    } else {
      element.append(...children);
    }
  }

  private static serializeObjectType(
    element: Element,
    key: string,
    processor: ElementType,
    properties: ICamelProcessorProperty,
    doc: Document,
    routeParent?: Element,
  ) {
    const childElementKey = processor[key] ? key : properties.oneOf?.find((key) => processor[key] !== undefined);
    if (childElementKey) {
      const childElement = this.serialize(childElementKey, processor[childElementKey] as ElementType, doc, routeParent);
      element.appendChild(childElement);
    }
  }

  static serializeSteps(steps: ElementType[], doc: Document, routeParent?: Element): Element[] {
    const stepElements: Element[] = [];

    steps.forEach((step) => {
      Object.entries(step).forEach(([stepKey, stepValue]) => {
        const step = stepValue as ElementType;
        const stepElement = this.serialize(stepKey, step, doc, routeParent);
        if (step.uri) {
          const uri = this.createUriFromParameters(step);
          stepElement.setAttribute('uri', uri as string);
        }
        stepElements.push(stepElement);
      });
    });
    return stepElements;
  }

  static createUriFromParameters(step: ElementType): string {
    const uri = step.uri as string;
    const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup('from', step);
    if (camelElementLookup.componentName === undefined) {
      return uri;
    }

    const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
    if (
      catalogLookup.catalogKind === CatalogKind.Component &&
      catalogLookup.definition?.component.syntax !== undefined
    ) {
      const requiredParameters: string[] = [];
      const defaultValues: ParsedParameters = {};
      if (catalogLookup.definition?.properties !== undefined) {
        Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
          if (value.required) requiredParameters.push(key);
          if (value.defaultValue) defaultValues[key] = value.defaultValue;
        });
      }

      return CamelUriHelper.getUriStringFromParameters(
        uri,
        catalogLookup.definition.component.syntax,
        step.parameters as ParsedParameters,
        {
          requiredParameters,
          defaultValues,
        },
      );
    }
    return uri;
  }

  private static serializeAttribute(
    element: Element,
    key: string,
    processor: ElementType,
    attributeValue: unknown,
  ): void {
    if (attributeValue) {
      const value = key === 'uri' ? this.createUriFromParameters(processor) : (attributeValue as string);
      element.setAttribute(key, value);
    }
  }

  static decorateDoTry(doTry: DoTry, doTryElement: Element, doc: Document): Element {
    doTry.doCatch?.forEach((doCatch) => {
      doTryElement.append(this.serialize('doCatch', doCatch as ElementType, doc));
    });

    doTryElement.append(this.serialize('doFinally', doTry.doFinally as ElementType, doc));
    return doTryElement;
  }
}
