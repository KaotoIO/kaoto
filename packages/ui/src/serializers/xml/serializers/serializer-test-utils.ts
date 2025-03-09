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

import { formatXml } from '../xml-utils';

export const normalizeXml = (xml: string) =>
  xml
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();

export const getDocument = () => {
  const parser = new DOMParser();
  return parser.parseFromString('', 'text/xml');
};

export const testSerializer = (expectedXML: string, result: Element) => {
  const xmlSerializer: XMLSerializer = new XMLSerializer();
  const resultString = formatXml(xmlSerializer.serializeToString(result));
  const expected = formatXml(expectedXML);
  expect(result).toBeDefined();
  expect(normalizeXml(resultString)).toEqual(normalizeXml(expected));
};
