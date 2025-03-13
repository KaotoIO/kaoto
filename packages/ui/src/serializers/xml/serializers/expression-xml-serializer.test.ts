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

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { getDocument, testSerializer } from './serializer-test-utils';
import { ExpressionXmlSerializer } from './expression-xml-serializer';

const oneOf = ['constant', 'csimple', 'simple', 'datasonnet', 'exchangeProperty', 'groovy', 'header', 'hl7terser'];
describe('ExpressionSerialisation tests', () => {
  const doc = getDocument();
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('serialize simple expression', () => {
    const entity = {
      constant: {
        expression: 'a=b',
      },
    };
    const expected = `<when><constant>a=b</constant></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize simple expression with empty expression', () => {
    const entity = {
      constant: {},
    };
    const expected = `<when><constant/></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize simple expression with empty expression different format', () => {
    const entity = {
      expression: {
        constant: {},
      },
    };
    const expected = `<when><constant/></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize simple expression with expression different format', () => {
    const entity = {
      expression: {
        simple: { expression: 'a=b' },
      },
    };
    const expected = `<when><simple>a=b</simple></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize simple expression with text definition', () => {
    const entity = {
      simple: 'a=b',
    };

    const expected = `<when><simple>a=b</simple></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize expression with attributes', () => {
    const entity = {
      csimple: {
        expression: '${body}',
        resultType: 'String',
      },
    };
    const expected = `<when><csimple resultType="String">\${body}</csimple></when>`;
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize expression with namespace', () => {
    const entity = {
      csimple: {
        expression: '${body}',
        namespace: [{ key: 'ns1', value: 'http://example.com/ns1' }],
      },
    };
    const expected = `<when><csimple>\${body}</csimple></when>`;
    const element = doc.createElement('when');
    const routeParent = doc.createElement('route');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element, routeParent);
    testSerializer(expected, element);
    expect(routeParent.getAttribute('xmlns:ns1')).toBe('http://example.com/ns1');
  });

  it('serialize expression with different key', () => {
    const entity = {
      completionPredicate: {
        constant: { expression: 'predicate' },
      },
    };
    const expected = `<aggregate><completionPredicate><constant>predicate</constant></completionPredicate></aggregate>`;
    const element = doc.createElement('aggregate');
    ExpressionXmlSerializer.serialize('completionPredicate', entity, oneOf, doc, element);
    testSerializer(expected, element);
  });

  it('serialize expression with unknown type', () => {
    const entity = {
      unknown: {
        expression: 'unknown',
      },
    };
    const element = doc.createElement('when');
    ExpressionXmlSerializer.serialize('expression', entity, oneOf, doc, element);
    expect(element.children.length).toBe(0);
  });
});
