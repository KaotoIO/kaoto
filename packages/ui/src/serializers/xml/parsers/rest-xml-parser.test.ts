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
import { RestXmlParser } from './rest-xml-parser';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';

describe('Rest XML Parser', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('should parse rest verbs correctly', () => {
    const xml = `
<rest path="/say" xmlns="http://camel.apache.org/schema/spring">
 <securityDefinitions>
            <oauth2 key="oauth2" flow="application" tokenUrl="{{oauth.token.url}}">
                             <scopes key="{{oauth.scope.service.self}}"
                         value="{{oauth.scope.service.self}}"/>
                 <scopes key="{{oauth.scope.test.person.data}}"
                         value="{{oauth.scope.test.person.data}}"/>
             </oauth2>
         </securityDefinitions>
    <get path="/hello">
        <param name="name" type="query" required="true" />
        <param name="name2" type="query" required="true" defaultValue="blah"/>
        <security key="hello" scopes="scope"/>
        <responseMessage message="hello" code="200">
         <examples key="example" value="value"/>
          <examples key="example" value="value"/>
          <header name="header" description="header" > 
            <allowableValues>
              <value>1</value>
              <value>2</value>
          </allowableValues>
        </header>
       </responseMessage>
        <to uri="direct:hello"/>
    </get>
  </rest>`;

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const restElement = doc.getElementsByTagName('rest')[0];
    const result = RestXmlParser.parse(restElement);

    expect(result).toEqual({
      path: '/say',
      securityDefinitions: {
        oauth2: {
          key: 'oauth2',
          flow: 'application',
          tokenUrl: '{{oauth.token.url}}',
          scopes: [
            { key: '{{oauth.scope.service.self}}', value: '{{oauth.scope.service.self}}' },
            { key: '{{oauth.scope.test.person.data}}', value: '{{oauth.scope.test.person.data}}' },
          ],
        },
      },

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
    });
  });
});
