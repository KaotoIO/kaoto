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
import { RestXmlSerializer } from './rest-xml-serializer';
import path from 'path';
import fs from 'fs';
import { restWithVerbsStup } from '../../../stubs/rest';

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
    testSerializer(expected, rest);
  });

  it('serialize full rest', () => {
    const xmlFilePath = path.join(__dirname, '../../../stubs/xml/rest.xml');
    const expected = fs.readFileSync(xmlFilePath, 'utf-8');

    const rest = RestXmlSerializer.serialize(restWithVerbsStup, doc);
    expect(rest).toBeDefined();
    testSerializer(expected, rest);
  });
});
