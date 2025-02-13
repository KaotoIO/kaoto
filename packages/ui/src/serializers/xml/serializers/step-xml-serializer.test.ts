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

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { describe } from 'node:test';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../models';

import {
  aggregateXml,
  circuitBreakerXml,
  filterXml,
  loadBalanceXml,
  loopXml,
  multicastXml,
  pipelineXml,
  resequenceXml,
  sagaXml,
  splitXml,
  choiceXml,
  doTryXml,
  deadLetterChannelXml,
  enrichXml,
  dynamicRouterXml,
  recipientListXml,
  routingSlipXml,
  throttleXml,
} from '../../../stubs/eip-xml-snippets';
import {
  aggregateEntity,
  circuitBreakerEntity,
  filterEntity,
  loadBalanceEntity,
  loopEntity,
  multicastEntity,
  pipelineEntity,
  resequenceEntity,
  sagaEntity,
  splitEntity,
  choiceEntity,
  doTryEntity,
  deadLetterChannelEntity,
  enrichEntity,
  dynamicRouterEntity,
  recipientListEntity,
  routingSlipEntity,
  throttleEntity,
} from '../../../stubs/eip-entity-snippets';
import { formatXml } from '../xml-utils';
import { StepXmlSerializer } from './step-xml-serializer';

export const normalizeLineEndings = (str: string): string => {
  return str
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
};
describe('Serialize EIP elements', () => {
  let domParser: DOMParser;
  let xmlSerializer: XMLSerializer;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    domParser = new DOMParser();
    xmlSerializer = new XMLSerializer();
  });

  const testCases = [
    { name: 'aggregate', xml: aggregateXml, entity: aggregateEntity },
    { name: 'circuitBreaker', xml: circuitBreakerXml, entity: circuitBreakerEntity },
    { name: 'filter', xml: filterXml, entity: filterEntity },
    { name: 'loadBalance', xml: loadBalanceXml, entity: loadBalanceEntity },
    { name: 'loop', xml: loopXml, entity: loopEntity },
    { name: 'multicast', xml: multicastXml, entity: multicastEntity },
    { name: 'pipeline', xml: pipelineXml, entity: pipelineEntity },
    { name: 'resequence', xml: resequenceXml, entity: resequenceEntity },
    { name: 'saga', xml: sagaXml, entity: sagaEntity },
    { name: 'split', xml: splitXml, entity: splitEntity },
    { name: 'choice', xml: choiceXml, entity: choiceEntity },
    { name: 'doTry', xml: doTryXml, entity: doTryEntity },
    { name: 'errorHandler', xml: deadLetterChannelXml, entity: deadLetterChannelEntity },
    { name: 'enrich', xml: enrichXml, entity: enrichEntity },
    { name: 'dynamicRouter', xml: dynamicRouterXml, entity: dynamicRouterEntity },
    { name: 'recipientList', xml: recipientListXml, entity: recipientListEntity },
    { name: 'routingSlip', xml: routingSlipXml, entity: routingSlipEntity },
    { name: 'throttle', xml: throttleXml, entity: throttleEntity },
  ];

  it.each(testCases)('Parse $name', ({ name, xml, entity }) => {
    const document = domParser.parseFromString('', 'application/xml');
    const result = StepXmlSerializer.serialize(name, entity, document);
    const expected = domParser.parseFromString(xml, 'application/xml').documentElement;
    const resultString = normalizeLineEndings(formatXml(xmlSerializer.serializeToString(result)));
    const expectedString = normalizeLineEndings(formatXml(xmlSerializer.serializeToString(expected)));
    expect(resultString).toEqual(expectedString);
  });
});
