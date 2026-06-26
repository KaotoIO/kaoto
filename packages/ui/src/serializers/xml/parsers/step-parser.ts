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

import { DoCatch, DoTry, ProcessorDefinition, When1 as When } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind, ICamelProcessorDefinition, ICamelProcessorProperty } from '../../../models';
import { CamelComponentSchemaService } from '../../../models/visualization/flows/support/camel-component-schema.service';
import { ARRAY_TYPE_NAMES, extractAttributesFromXmlElement, PROCESSOR_NAMES } from '../utils/xml-utils';
import { ExpressionParser } from './expression-parser';

export type ElementTransformer = (element: Element) => Promise<unknown>;

export class StepParser {
  private static readonly SKIP_KEYS = ['doCatch', 'doFinally', 'onFallback', 'when', 'onWhen'];

  static async parseSteps(parentElement: Element, processorKeys: string[]): Promise<ProcessorDefinition[]> {
    const children = Array.from(parentElement.children).filter((child) => {
      // onFallback is listed as a processor in the catalog, but it is not a processor. RouteXmlParser. is already fixed in the main branch of the camel
      return processorKeys.includes(child.tagName) && !this.SKIP_KEYS.includes(child.tagName); // Filter out elements not needed
    });

    return Promise.all(
      children.map(async (child) => {
        const step: ProcessorDefinition = {
          [child.tagName as keyof ProcessorDefinition]: await this.parseElement(child),
        };
        return step;
      }),
    );
  }

  static async getProcessorModel(element: Element): Promise<{
    processorName: string;
    processorModel: ICamelProcessorDefinition | undefined;
  }> {
    let processorName = PROCESSOR_NAMES.get(element.tagName) ?? element.tagName;
    let processorModel = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, processorName);
    if (processorName === 'onWhen' && !processorModel) {
      processorModel = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'when');
      processorName = 'when';
    }
    return { processorName, processorModel };
  }

  static async parseElement(element: Element, transformer?: ElementTransformer): Promise<unknown> {
    if (!element) return {};

    const { processorName, processorModel } = await this.getProcessorModel(element);

    //Some elements are not defined in the catalog even if they are defined in the schemas, so we need to extract them as plain objects
    if (!processorModel) {
      return extractAttributesFromXmlElement(element);
    }

    let processor: { [key: string]: unknown } = {};

    for (const [name, properties] of Object.entries(processorModel.properties)) {
      switch (properties.kind) {
        case 'value':
          processor[name] = element.textContent;
          break;
        case 'attribute':
          if (element.hasAttribute(name)) {
            processor = { ...processor, ...this.parseAttributeType(name, element) };
          }
          break;
        case 'expression':
          if (name === 'expression') {
            processor = { ...processor, ...(await ExpressionParser.parse(element, properties)) };
          } else processor[name] = await ExpressionParser.parse(element, properties, name);
          break;

        case 'element':
          {
            const elementType = await this.parseElementType(name, element, properties, transformer);
            if (elementType) {
              processor[elementType.key] = elementType.value;
            }
          }
          break;
      }
    }

    // handle cases that aren't defined in catalog or are defined incorrectly
    await this.handleSpecialCases(processorName, element, processor, processorModel.properties);

    return processor;
  }

  static async parseElementType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer?: ElementTransformer,
  ): Promise<{ key: string; value: unknown } | undefined> {
    if (properties.type === 'object') {
      return this.parseObjectType(name, element, properties);
    }
    if (properties.type === 'array') {
      return this.parseArrayType(name, element, properties, transformer);
    }

    return undefined;
  }

  private static parseAttributeType(name: string, element: Element): { [key: string]: unknown } {
    if (name === 'uri') {
      const uriString = element.getAttribute('uri');
      if (!uriString) return {};
      return CamelComponentSchemaService.getComponentDefinitionFromUri(uriString) ?? {};
    }
    if (element.hasAttribute(name)) {
      return { [name]: element.getAttribute(name) };
    }
    return {};
  }

  private static findSingleElement(
    element: Element,
    properties: ICamelProcessorProperty,
    name: string,
  ): Element | undefined {
    if (properties.oneOf) {
      return properties.oneOf.map((tag) => element.getElementsByTagName(tag)[0]).find(Boolean);
    }
    return element.getElementsByTagName(name)[0];
  }

  private static async parseObjectType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
  ): Promise<{ key: string; value: unknown } | undefined> {
    const singleElement = this.findSingleElement(element, properties, name);

    return singleElement
      ? {
          key: singleElement.tagName,
          value: await this.parseElement(singleElement),
        }
      : undefined;
  }

  private static async parseArrayType(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer?: ElementTransformer,
  ): Promise<{ key: string; value: unknown }> {
    if (name === 'outputs') {
      // if outputs is specified then the processor has steps

      const steps = await this.parseSteps(element, properties.oneOf!);
      if (steps.length > 0 || properties.required) return { key: 'steps', value: steps };
    }
    const arrayClause = await this.parseElementsArray(name, element, properties, transformer);

    if (arrayClause.length > 0) return { key: name, value: arrayClause };
    return { key: name, value: properties.required ? [] : undefined };
  }

  static async parseElementsArray(
    name: string,
    element: Element,
    properties: ICamelProcessorProperty,
    transformer = (el: Element) => this.parseElement(el),
  ): Promise<unknown[]> {
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

    return Promise.all(
      Array.from(children).map((el) =>
        properties.javaType === 'java.util.List<java.lang.String>' ? el.textContent : transformer(el),
      ),
    );
  }

  static async decorateDoTry(doTryElement: Element, processor: DoTry) {
    const doCatchArray: DoCatch[] = [];
    let doFinallyElement = undefined;

    for (const child of Array.from(doTryElement.children)) {
      const tagNameLower = child.tagName;
      const element = await this.parseElement(child);

      if (child.tagName === 'doCatch') {
        //set to undefined because onWhen definition doesn't have steps. It's a special case
        this.checkOnWhen(element);
        doCatchArray.push(element as DoCatch);
      } else if (tagNameLower === 'doFinally') {
        doFinallyElement = element;
      }
    }

    processor['doCatch'] = doCatchArray;
    processor['doFinally'] = doFinallyElement as DoTry['doFinally'];
  }

  private static async handleSpecialCases(
    processorName: string,
    element: Element,
    processor: { [p: string]: unknown },
    processorProperties: Record<string, ICamelProcessorProperty>,
  ) {
    //  doTry properties are missing in the catalog up to 4.9
    if (processorName === 'doTry' && !processorProperties['doCatch'] && !processorProperties['doFinally']) {
      await this.decorateDoTry(element, processor);
    }
    if (processorName.includes('intercept') && !processorProperties['onWhen']) {
      await this.decorateIntercept(element, processor);
    }
    // saga compensation/completion changed from nested elements to attributes in Camel 4.20.0
    if (processorName === 'saga') {
      this.decorateSaga(element, processor);
    }
  }

  private static decorateSaga(element: Element, processor: { [p: string]: unknown }) {
    // Handle old format (nested elements) if attributes are not present
    if (!processor['compensation']) {
      const compensationElement = element.getElementsByTagName('compensation')[0];
      if (compensationElement?.hasAttribute('uri')) {
        processor['compensation'] = compensationElement.getAttribute('uri');
      }
    }
    if (!processor['completion']) {
      const completionElement = element.getElementsByTagName('completion')[0];
      if (completionElement?.hasAttribute('uri')) {
        processor['completion'] = completionElement.getAttribute('uri');
      }
    }
  }

  private static async decorateIntercept(element: Element, processor: { [p: string]: unknown }) {
    //if when is defined or newer catalog is used, we don't need to parse it again
    if (processor['when'] || processor['onWhen']) return;

    const whenElement = element.getElementsByTagName('when')[0];
    if (whenElement) {
      const when = (await this.parseElement(whenElement)) as { [key: string]: unknown; steps?: [] };
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
