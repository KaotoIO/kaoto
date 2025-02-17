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
import path from 'path';
import fs from 'fs';
import { restWithVerbsStup } from '../../../stubs/rest';

describe('Rest XML Parser', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('should parse rest verbs correctly', () => {
    const xmlFilePath = path.join(__dirname, '../../../stubs/xml/rest.xml');
    const xml = fs.readFileSync(xmlFilePath, 'utf-8');

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const restElement = doc.getElementsByTagName('rest')[0];
    const result = RestXmlParser.parse(restElement);

    expect(result).toEqual(restWithVerbsStup);
  });
});
