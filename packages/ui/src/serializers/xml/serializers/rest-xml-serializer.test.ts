/*
 * Copyright (C) 2023 Red Hat, Inc.
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
import { describe } from 'node:test';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';
import { getDocument, testSerializer } from './serializer-test-utils';
import { RestXmlSerializer } from './rest-xml-serializer';

describe('RestXmlParser tests', () => {
  const doc = getDocument();
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('serialize param', () => {
    const entity = {
      get: [
        {
          param: [
            { name: 'name', type: 'query', required: 'true' },
            { name: 'name2', type: 'query', required: 'true', defaultValue: 'blah' },
          ],
        },
      ],
    };
    const expected = `<rest>
    <get>
       <param name="name" type="query" required="true"/>
       <param name="name2" type="query" defaultValue="blah" required="true"/>
    </get></rest>`;
    const rest = RestXmlSerializer.serialize(entity, doc);
    expect(rest).toBeDefined();
    testSerializer(expected, rest!);
  });

  it('serialize full rest', () => {
    const expected = `
<rest path="/say">
    <get path="/hello">
    <to uri="direct:hello"/>
        <param name="name" type="query" required="true"/>
        <param name="name2" type="query" defaultValue="blah" required="true"/>
        <security key="hello" scopes="scope"/>
        <responseMessage code="200"  message="hello">
          <header  description="header"  name="header">
            <allowableValues>
              <value>1</value>
              <value>2</value>
          </allowableValues>
        </header>
        <examples key="example" value="value"/>
          <examples key="example" value="value"/>
       </responseMessage>
    </get>
  </rest>`;
    const entity = {
      path: '/say',
      get: [
        {
          path: '/hello',
          param: [
            { name: 'name', type: 'query', required: 'true' },
            { name: 'name2', type: 'query', required: 'true', defaultValue: 'blah' },
          ],
          security: [{ key: 'hello', scopes: 'scope' }],
          responseMessage: [
            {
              message: 'hello',
              code: '200',
              examples: [
                { key: 'example', value: 'value' },
                { key: 'example', value: 'value' },
              ],
              header: [
                {
                  name: 'header',
                  description: 'header',
                  allowableValues: [{ value: '1' }, { value: '2' }],
                },
              ],
            },
          ],
          to: { uri: 'direct:hello' },
        },
      ],
    };

    const rest = RestXmlSerializer.serialize(entity, doc);
    expect(rest).toBeDefined();
    testSerializer(expected, rest!);
  });
});
