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

import { CamelCatalogService, CatalogKind } from '../../../models';
import { setNamespaces } from '../xml-utils';

type Expression = { expression: string; [key: string]: unknown };
export class ExpressionXmlSerializer {
  static serialize(key: string, expressionObjext: unknown, doc: Document, element: Element, routeParent?: Element) {
    if (!expressionObjext) return;
    let expression: Element;
    //todo comment
    if (key !== 'expression') {
      expression = doc.createElement(key);
      expression.append(ExpressionXmlSerializer.createExpressionElement(expressionObjext, doc, routeParent));
    } else {
      expression = ExpressionXmlSerializer.createExpressionElement(expressionObjext, doc, routeParent);
    }

    element.appendChild(expression);
  }

  static createExpressionElement(expressionEntity: unknown, doc: Document, routeParent?: Element): Element {
    const expression = expressionEntity as { [key: string]: unknown };

    const [expressionType, expressionObject] = Object.entries(expression)[0] as [string, Expression];

    const expressionElement = doc.createElement(expressionType);
    const properties = CamelCatalogService.getComponent(CatalogKind.Processor, expressionType)?.properties;

    expressionElement.textContent = expressionObject.expression;

    for (const [key, value] of Object.entries(expressionObject)) {
      if (key === 'expression') continue;
      if (key === 'namespace' && value && routeParent) {
        setNamespaces(routeParent, value as { key: string; value: string }[]);
      }

      if (properties && properties[key] && properties[key].kind === 'attribute') {
        expressionElement.setAttribute(key, String(value));
      }
    }
    return expressionElement;
  }
}
