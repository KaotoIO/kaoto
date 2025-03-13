/*
 * Copyright (C) 2025a Red Hat, Inc.
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

import { CamelCatalogService, CatalogKind } from '../../../models';
import { setNamespaces } from '../utils/xml-utils';

type Expression = { expression: string; [key: string]: unknown };

export class ExpressionXmlSerializer {
  static serialize(
    key: string,
    stepWithExpression: unknown,
    oneOf: string[] | undefined,
    doc: Document,
    element: Element,
    routeParent?: Element,
  ) {
    if (!stepWithExpression) return;

    const expressionStep = stepWithExpression as { [key: string]: unknown };

    const expressionObject: { [key: string]: unknown } = this.extractExpressionObject(key, expressionStep);
    if (!expressionObject) return;

    const expressionType = oneOf?.find((e) => expressionObject[e] !== undefined);
    if (!expressionType) return;

    const expressionDefinition = expressionObject[expressionType] as Expression;

    let expression: Element;
    //for cases like correlationExpression etc...
    if (key !== 'expression') {
      expression = doc.createElement(key);
      expression.append(
        ExpressionXmlSerializer.createExpressionElement(expressionType, expressionDefinition, doc, routeParent),
      );
    } else {
      expression = ExpressionXmlSerializer.createExpressionElement(
        expressionType,
        expressionDefinition,
        doc,
        routeParent,
      );
    }

    element.appendChild(expression);
  }

  static createExpressionElement(
    expressionType: string,
    expressionObject: Expression | string,
    doc: Document,
    routeParent?: Element,
  ): Element {
    const expressionElement = doc.createElement(expressionType);
    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, expressionType)?.properties;

    expressionElement.textContent =
      typeof expressionObject === 'string' ? expressionObject : expressionObject.expression;

    for (const [key, value] of Object.entries(expressionObject)) {
      if (key === 'expression') continue;
      if (key === 'namespace' && value && routeParent) {
        setNamespaces(routeParent, value as { key: string; value: string }[]);
      }

      if (properties?.[key]?.kind === 'attribute') {
        expressionElement.setAttribute(key, String(value));
      }
    }
    return expressionElement;
  }

  static extractExpressionObject(key: string, expressionStep: { [key: string]: unknown }): { [key: string]: unknown } {
    if (expressionStep['expression']) return expressionStep['expression'] as { [key: string]: unknown };

    return key !== 'expression' ? (expressionStep[key] as { [key: string]: unknown }) : expressionStep;
  }
}
