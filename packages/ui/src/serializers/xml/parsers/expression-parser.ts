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
import { collectNamespaces, extractAttributesFromXmlElement } from '../xml-utils';
import { CamelCatalogService, CatalogKind, ICamelProcessorProperty } from '../../../models';
import { ExpressionDefinition } from '@kaoto/camel-catalog/types';

export class ExpressionParser {
  static parse(
    parentElement: Element,
    properties?: ICamelProcessorProperty,
    tagName?: string,
  ): ExpressionDefinition | undefined {
    // Find the element to parse, expression type elements are defined differently depending on the component
    const element = tagName ? parentElement.getElementsByTagName(tagName)[0] : parentElement;
    if (!element) return undefined;

    // If the element has a oneOf property, we need to find the correct element to parse i.e <simple>, <constant>, etc.
    const expressionElement = properties
      ? Array.from(element.children).find((expression) => properties.oneOf?.includes(expression.tagName))
      : element;

    if (!expressionElement) return undefined;

    return this.buildExpressionDefinition(expressionElement);
  }

  private static buildExpressionDefinition(expressionElement: Element): ExpressionDefinition | undefined {
    const expressionType = expressionElement.tagName;
    const expressionTypeProperties = CamelCatalogService.getComponent(
      CatalogKind.Processor,
      expressionType,
    )?.properties;

    const expressionAttributes = extractAttributesFromXmlElement(expressionElement, expressionTypeProperties);
    const namespaces = expressionTypeProperties?.namespace ? collectNamespaces(expressionElement) : [];

    return {
      [expressionType]: {
        expression: expressionTypeProperties?.expression ? expressionElement.textContent : undefined,
        ...expressionAttributes,
        namespace: namespaces.length > 0 ? namespaces : undefined,
      },
    } as ExpressionDefinition;
  }
}
