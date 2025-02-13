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

import { DoCatch, DoTry, ProcessorDefinition, When1 as When } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind, ICamelProcessorProperty } from '../../../models';
import { ARRAY_TYPE_NAMES, extractAttributesFromXmlElement, PROCESSOR_NAMES } from '../xml-utils';
import { ExpressionParser } from './expression-parser';

export type ElementTransformer = (element: Element) => unknown;

export class StepParser {
  private static readonly SKIP_KEYS = ['doCatch', 'doFinally', 'onFallback', 'when', 'onWhen'];

  static parseSteps(parentElement: Element, processorKeys: string[]): ProcessorDefinition[] {
    return Array.from(parentElement.children)
      .filter((child) => {
        // onFallback is listed as a processor in the catalog, but it is not a processor. RouteXmlParser. is already fixed in the main branch of the camel
        return processorKeys.includes(child.tagName) && !this.SKIP_KEYS.includes(child.tagName); // Filter out elements not needed
      })
      .map((child) => {
        const step: ProcessorDefinition = {
          [child.tagName as keyof ProcessorDefinition]: this.parseElement(child),
        };
        return step;
      });
  }

  static parseElement(element: Element, transformer?: ElementTransformer): unknown {
    if (!element) return {};
    const processorName = PROCESSOR_NAMES.get(element.tagName) ?? element.tagName;
    const processorModel = CamelCatalogService.getComponent(CatalogKind.Processor, processorName);

    //Some elements are not defined in the catalog even if they are defined in the schemas, so we need to extract them as plain objects
    if (!processorModel) {
      return extractAttributesFromXmlElement(element);
    }

    const processor: { [key: string]: unknown } = {};

    Object.entries(processorModel.properties).forEach(([name, properties]) => {
      switch (properties.kind) {
        case 'value':
          processor[name] = element.textContent;
          break;
        case 'attribute':
          if (element.hasAttribute(name)) {
            processor[name] = element.getAttribute(name);
          }
          break;
        case 'expression':
          processor[name] = ExpressionParser.parse(element, properties, name === 'expression' ? undefined : name);
          break;

        case 'element':
          {
            const elementType = this.parseElementType(name, element, properties, transformer);
            if (elementType) {
              processor[elementType.key] = elementType.value;
            }
          }
          break;
      }
    });

    // handle cases that aren't defined in catalog or are defined incorrectly
    this.handleSpecialCases(processorName, element, processor);

    return processor;
  }

  static parseElementType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer?: ElementTransformer,
  ): { key: string; value: unknown } | undefined {
    if (properties.type === 'object') {
      return this.parseObjectType(name, element, properties);
    }
    if (properties.type === 'array') {
      return this.parseArrayType(name, element, properties, transformer);
    }

    return undefined;
  }

  private static findSingleElement(
    element: Element,
    properties: ICamelProcessorProperty,
    name: string,
  ): Element | undefined {
    if (properties.oneOf) {
      return properties.oneOf.map((tag) => element.getElementsByTagName(tag)[0]).find((el) => el);
    }
    return element.getElementsByTagName(name)[0];
  }

  private static parseObjectType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
  ): { key: string; value: unknown } | undefined {
    const singleElement = this.findSingleElement(element, properties, name);

    return singleElement
      ? {
          key: singleElement.tagName,
          value: this.parseElement(singleElement),
        }
      : undefined;
  }

  private static parseArrayType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer?: ElementTransformer,
  ): { key: string; value: unknown } {
    if (name === 'outputs') {
      // if outputs is specified then the processor has steps

      const steps = this.parseSteps(element, properties.oneOf!);
      if (steps.length > 0 || properties.required) return { key: 'steps', value: steps };
    }
    const arrayClause = this.parseElementsArray(name, element, properties, transformer);

    if (arrayClause.length > 0) return { key: name, value: arrayClause };
    return { key: name, value: properties.required ? [] : undefined };
  }

  static parseElementsArray(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer?: ElementTransformer,
  ): unknown[] {
    const arrayElementName = ARRAY_TYPE_NAMES.get(name) ?? name;
    let children;
    if (properties.oneOf) {
      children = Array.from(element.children).filter((e) => properties.oneOf!.includes(e.tagName));
    } else {
      children = name === arrayElementName ? element.children : element.getElementsByTagName(name)[0]?.children;
      // we need to filter only direct children because getElementsByTagName returns all descendants
      if (children) children = Array.from(children).filter((e) => e.tagName === arrayElementName);
    }

    if (!children) return [];

    return Array.from(children).map((el) =>
      properties.javaType === 'java.util.List<java.lang.String>'
        ? el.textContent
        : transformer
          ? transformer(el)
          : this.parseElement(el),
    );
  }

  static decorateDoTry(doTryElement: Element, processor: DoTry) {
    const doCatchArray: DoCatch[] = [];
    let doFinallyElement = undefined;

    Array.from(doTryElement.children).forEach((child) => {
      const tagNameLower = child.tagName;
      const element = this.parseElement(child);

      if (child.tagName === 'doCatch') {
        //set to undefined because onWhen definition doesn't have steps. It's a special case
        this.checkOnWhen(element);
        doCatchArray.push(element as DoCatch);
      } else if (tagNameLower === 'doFinally') {
        doFinallyElement = element;
      }
    });

    processor['doCatch'] = doCatchArray;
    processor['doFinally'] = doFinallyElement;
  }

  private static handleSpecialCases(processorName: string, element: Element, processor: { [p: string]: unknown }) {
    //  doTry properties are missing in the catalog up to 4.9
    if (processorName === 'doTry') {
      this.decorateDoTry(element, processor);
    }
    if (processorName.includes('intercept')) {
      this.decorateIntercept(element, processor);
    }
  }

  private static decorateIntercept(element: Element, processor: { [p: string]: unknown }) {
    //if when is defined or newer catalog is used, we don't need to parse it again
    if (processor['when'] || processor['onWhen']) return;

    const whenElement = element.getElementsByTagName('when')[0];
    if (whenElement) {
      const when = this.parseElement(whenElement) as { [key: string]: unknown; steps?: [] };
      when['steps'] = undefined;
      processor['when'] = when;
    }
  }

  private static checkOnWhen(element: unknown) {
    const e = element as { [key: string]: unknown };
    if (e.onWhen) {
      if ((e.onWhen as When).steps) {
        (element as { onWhen: When }).onWhen.steps = undefined;
      }
    }
  }
}
