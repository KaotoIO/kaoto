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

import { DoTry } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorProperty } from '../../../models';
import { CamelComponentSchemaService } from '../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelUriHelper, ParsedParameters } from '../../../utils';
import { ARRAY_TYPE_NAMES, PROCESSOR_NAMES } from '../utils/xml-utils';
import { ExpressionXmlSerializer } from './expression-xml-serializer';

export type ElementType = { [key: string]: unknown; steps?: ElementType[] };

export class StepXmlSerializer {
  static async serializeObjectProperties(
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
          await this.serializeAttribute(element, key, processor, props, processor[key]);
          break;

        case 'expression':
          await ExpressionXmlSerializer.serialize(key, processor, props.oneOf, doc, element, routeParent);
          break;

        case 'element':
          await this.serializeElementType(element, key, processor, props, doc, routeParent);
          break;
      }
    }
  }

  static async serialize(
    elementName: string,
    camelElement: ElementType,
    doc: Document,
    parent?: Element,
  ): Promise<Element> {
    const element = doc.createElement(elementName);

    //unidentified might be when a new element is added from the form
    if (!camelElement) return element;
    if (camelElement[elementName]) {
      // for cases like errorHandler, intercept in the route configuration etc where the element is nested i.e intercept:{intercept:{...}}
      camelElement = camelElement[elementName] as ElementType;
    }
    const routeParent = elementName === 'route' ? element : parent;

    const processorDefinition = await DynamicCatalogRegistry.get().getEntity(
      CatalogKind.Processor,
      PROCESSOR_NAMES.get(elementName) ?? elementName,
    );
    const properties = processorDefinition?.properties;

    if (!properties) {
      await this.serializeUnknownType(element, camelElement, doc, routeParent);
      return element;
    }

    await this.serializeObjectProperties(element, doc, camelElement, properties, routeParent);

    // process doTry element only when doCatch and doFinally are not present in the catalog
    if (elementName === 'doTry' && !properties['doCatch'] && !properties['doFinally']) {
      await this.decorateDoTry(camelElement as DoTry, element, doc);
    }

    // saga compensation/completion: support both old (nested elements) and new (attributes) formats
    if (elementName === 'saga') {
      this.decorateSaga(camelElement, element, doc, properties);
    }

    return element;
  }

  private static async serializeUnknownType(element: Element, obj: ElementType, doc: Document, routeParent?: Element) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        const childElement = await this.serialize(key, value as ElementType, doc, routeParent);
        element.appendChild(childElement);
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }

  private static async serializeElementType(
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
      await this.serializeArrayType(element, key, processor, properties, doc, routeParent);
    } else {
      await this.serializeObjectType(element, key, processor, properties, doc, routeParent);
    }
  }

  private static async serializeArrayType(
    element: Element,
    key: string,
    processor: ElementType,
    props: ICamelProcessorProperty,
    doc: Document,
    routeParent?: Element,
  ) {
    if (key === 'outputs' && processor['steps']) {
      const steps = await this.serializeSteps(processor['steps'], doc, routeParent);
      element.append(...steps);
      return;
    }
    const value = processor[key];
    if (!Array.isArray(value) || value.length === 0) return;

    //handle special case like allowableValues
    const childName = ARRAY_TYPE_NAMES.get(key) ?? key;
    const isStringList = props.javaType === 'java.util.List<java.lang.String>';

    const children = await Promise.all(
      (value as ElementType[]).map(async (v) => {
        let childElement;
        if (isStringList) {
          childElement = doc.createElement(childName);
          childElement.textContent = v as unknown as string;
          return childElement;
        }

        return this.serialize(childName, v, doc, routeParent);
      }),
    );

    //  Append children based on naming convention
    if (childName === key) {
      element.append(...children);
    } else {
      const arrayElement = doc.createElement(key);
      arrayElement.append(...children);
      element.appendChild(arrayElement);
    }
  }

  private static async serializeObjectType(
    element: Element,
    key: string,
    processor: ElementType,
    properties: ICamelProcessorProperty,
    doc: Document,
    routeParent?: Element,
  ) {
    if (properties.javaType === 'java.lang.String' && processor[key]) {
      this.serializeTextType(element, key, processor, doc);
      return;
    }

    const childElementKey = processor[key] ? key : properties.oneOf?.find((key) => processor[key] !== undefined);
    if (childElementKey) {
      const childElement = await this.serialize(
        childElementKey,
        processor[childElementKey] as ElementType,
        doc,
        routeParent,
      );
      element.appendChild(childElement);
    }
  }

  static async serializeSteps(steps: ElementType[], doc: Document, routeParent?: Element): Promise<Element[]> {
    if (!steps) return [];
    const stepElements: Element[] = [];

    for (const step of steps) {
      // in case of empty step
      if (!step) continue;

      for (const [stepKey, stepValue] of Object.entries(step)) {
        const stepObj = stepValue as ElementType;
        const stepElement = await this.serialize(stepKey, stepObj, doc, routeParent);
        if (stepObj.uri) {
          const uri = await this.createUriFromParameters(stepObj);
          stepElement.setAttribute('uri', uri);
        }
        stepElements.push(stepElement);
      }
    }

    return stepElements;
  }

  static async createUriFromParameters(step: ElementType): Promise<string> {
    const uri = step.uri as string;
    const camelElementLookup = CamelComponentSchemaService.getCamelComponentLookup('from', step);
    if (camelElementLookup.componentName === undefined) return uri;

    const catalogResult = await CamelComponentSchemaService.resolveCatalogLookup(camelElementLookup.componentName);

    if (catalogResult?.catalogKind === CatalogKind.Kamelet && catalogResult.definition !== undefined) {
      // Kamelets don't use syntax-based URI building
      return step.parameters && Object.keys(step.parameters).length > 0
        ? CamelUriHelper.getUriStringFromParameters(uri, '', step.parameters as ParsedParameters)
        : uri;
    }

    const componentDefinition = catalogResult?.definition as ICamelComponentDefinition | undefined;
    if (componentDefinition?.component.syntax !== undefined) {
      return this.buildUriFromComponentDefinition(uri, step.parameters as ParsedParameters, componentDefinition);
    }

    // This fallback applies only when the component does not define a syntax (e.g., for Kamelets or Components without syntax).
    return step.parameters && Object.keys(step.parameters).length > 0
      ? CamelUriHelper.getUriStringFromParameters(uri, '', step.parameters as ParsedParameters)
      : uri;
  }

  private static buildUriFromComponentDefinition(
    uri: string,
    parameters: ParsedParameters | undefined,
    componentDefinition: ICamelComponentDefinition,
  ): string {
    const { requiredParameters, defaultValues } = Object.entries(componentDefinition.properties ?? {}).reduce(
      (acc, [key, value]) => {
        if (value.required) acc.requiredParameters.push(key);
        if (value.defaultValue !== undefined) acc.defaultValues[key] = value.defaultValue;
        return acc;
      },
      { requiredParameters: [] as string[], defaultValues: {} as ParsedParameters },
    );
    return CamelUriHelper.getUriStringFromParameters(uri, componentDefinition.component.syntax!, parameters, {
      requiredParameters,
      defaultValues,
    });
  }

  private static async serializeAttribute(
    element: Element,
    key: string,
    processor: ElementType | string,
    props: ICamelProcessorProperty,
    attributeValue: unknown,
  ): Promise<void> {
    if (typeof processor === 'string') {
      if (props.required) element.setAttribute(key, processor);
      return;
    }

    if (!attributeValue) return;

    const value = key === 'uri' ? await this.createUriFromParameters(processor) : String(attributeValue);
    element.setAttribute(key, value);
  }

  static async decorateDoTry(doTry: DoTry, doTryElement: Element, doc: Document): Promise<Element> {
    for (const doCatch of doTry.doCatch ?? []) {
      doTryElement.append(await this.serialize('doCatch', doCatch as ElementType, doc));
    }

    doTryElement.append(await this.serialize('doFinally', doTry.doFinally as ElementType, doc));
    return doTryElement;
  }

  private static decorateSaga(
    saga: ElementType,
    sagaElement: Element,
    doc: Document,
    properties: Record<string, ICamelProcessorProperty>,
  ): void {
    // Check if catalog defines compensation/completion as attributes (Camel 4.20.0+)
    const compensationIsAttribute = properties['compensation']?.kind === 'attribute';
    const completionIsAttribute = properties['completion']?.kind === 'attribute';

    // If not attributes in catalog, serialize as nested elements for backward compatibility.
    // compensation/completion may be a string uri or a legacy object-shaped { uri } value.
    const compensationUri = CamelUriHelper.getUriString(saga['compensation']);
    if (!compensationIsAttribute && compensationUri) {
      const compensationElement = doc.createElement('compensation');
      compensationElement.setAttribute('uri', compensationUri);
      sagaElement.appendChild(compensationElement);
    }

    const completionUri = CamelUriHelper.getUriString(saga['completion']);
    if (!completionIsAttribute && completionUri) {
      const completionElement = doc.createElement('completion');
      completionElement.setAttribute('uri', completionUri);
      sagaElement.appendChild(completionElement);
    }
  }

  private static serializeTextType(element: Element, key: string, processor: ElementType, doc: Document) {
    const childElement = doc.createElement(key);
    childElement.textContent = processor[key] as string;
    element.appendChild(childElement);
  }
}
