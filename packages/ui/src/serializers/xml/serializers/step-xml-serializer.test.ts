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
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../../../models';
import {
  aggregateEntity,
  choiceEntity,
  circuitBreakerEntity,
  deadLetterChannelEntity,
  doTryEntity,
  dynamicRouterEntity,
  enrichEntity,
  filterEntity,
  loadBalanceEntity,
  loopEntity,
  multicastEntity,
  pipelineEntity,
  recipientListEntity,
  resequenceEntity,
  routingSlipEntity,
  sagaEntity,
  splitEntity,
  throttleEntity,
} from '../../../stubs/eip-entity-snippets';
import {
  aggregateXml,
  choiceXml,
  circuitBreakerXml,
  deadLetterChannelXml,
  doTryXml,
  dynamicRouterXml,
  enrichXml,
  filterXml,
  loadBalanceXml,
  loopXml,
  multicastXml,
  pipelineXml,
  recipientListXml,
  resequenceXml,
  routingSlipXml,
  sagaXml,
  splitXml,
  throttleXml,
} from '../../../stubs/eip-xml-snippets';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { XmlFormatter } from '../utils/xml-formatter';
import { getDocument } from './serializer-test-utils';
import { ElementType, StepXmlSerializer } from './step-xml-serializer';

export const normalizeLineEndings = (str: string): string => {
  return str
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
};

describe('step-xml-serializer tests', () => {
  let domParser: DOMParser;
  let xmlSerializer: XMLSerializer;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);
    domParser = new DOMParser();
    xmlSerializer = new XMLSerializer();
  });

  describe('serialize steps with string definitions', () => {
    const testCases = [
      { name: 'to', stepString: 'file:output?fileName=output.txt&fileExist=Append', attributeName: 'uri' },
      { name: 'toD', stepString: 'file:output?fileName=output.txt&fileExist=Append', attributeName: 'uri' },
      { name: 'log', stepString: 'message', attributeName: 'message' },
      { name: 'customLoadBalancer', stepString: 'ref', attributeName: 'ref' },
      { name: 'setExchangePattern', stepString: 'a*=b', attributeName: 'pattern' },
      { name: 'routeBuilder', stepString: 'customBuilder', attributeName: 'ref' },
      { name: 'removeVariable', stepString: 'variable', attributeName: 'name' },
      { name: 'removeProperty', stepString: 'variable', attributeName: 'name' },
      { name: 'removeProperties', stepString: 'a*', attributeName: 'pattern' },
      { name: 'removeHeaders', stepString: 'a*', attributeName: 'pattern' },
      { name: 'removeHeader', stepString: 'header', attributeName: 'name' },
      { name: 'convertBodyTo', stepString: 'string', attributeName: 'type' },
    ];

    it.each(testCases)('serializes $name with string definition', ({ name, stepString, attributeName }) => {
      const step = stepString as unknown as ElementType;

      const result = StepXmlSerializer.serialize(name, step, getDocument());

      expect(result.tagName).toBe(name);
      expect(result.getAttribute(attributeName)).toBe(stepString);
    });
  });

  describe('Basic serialization', () => {
    it('serializes a to step with URI', () => {
      const toStep = {
        uri: 'file:output',
        parameters: {
          fileName: 'output.txt',
          directoryName: 'output',
          fileExist: 'Append',
        },
      };

      const result = StepXmlSerializer.serialize('to', toStep, getDocument());
      expect(result.tagName).toBe('to');
      expect(result.getAttribute('uri')).toBe('file:output?fileName=output.txt&fileExist=Append');
    });

    it('serializes a step with attributes', () => {
      const logStep = {
        message: 'Hello World',
        logName: 'testLogger',
      };

      const result = StepXmlSerializer.serialize('log', logStep, getDocument());
      expect(result.tagName).toBe('log');
      expect(result.getAttribute('message')).toBe('Hello World');
      expect(result.getAttribute('logName')).toBe('testLogger');
    });

    it('serializes a step with nested elements', () => {
      const parentStep = {
        steps: [{ to: { uri: 'direct:first' } }, { to: { uri: 'direct:second' } }],
      };

      const result = StepXmlSerializer.serialize('route', parentStep, getDocument());
      expect(result.tagName).toBe('route');
      expect(result.children.length).toBe(2);
      expect(result.children[0].tagName).toBe('to');
      expect(result.children[0].getAttribute('uri')).toBe('direct:first');
      expect(result.children[1].tagName).toBe('to');
      expect(result.children[1].getAttribute('uri')).toBe('direct:second');
    });

    it('creates URI from component parameters correctly', () => {
      const fileStep = {
        uri: 'file:data',
        parameters: {
          noop: true,
          recursive: true,
          delete: false,
        },
      };

      const result = StepXmlSerializer.serialize('from', fileStep, getDocument());
      expect(result.tagName).toBe('from');
      expect(result.getAttribute('uri')).toBe('file:data?noop=true&recursive=true&delete=false');
    });

    it('creates URI from kamelet parameters correctly', () => {
      const kameletStep = {
        uri: 'kamelet:log-action',
        parameters: {
          level: 'DEBUG',
          multiline: true,
          showHeaders: false,
        },
      };

      const result = StepXmlSerializer.serialize('from', kameletStep, getDocument());
      expect(result.tagName).toBe('from');
      expect(result.getAttribute('uri')).toBe('kamelet:log-action?level=DEBUG&multiline=true&showHeaders=false');
    });

    it('should not call decorateDoTry when doCatch and doFinally are in the catalog', () => {
      const decorateDoTrySpy = jest.spyOn(StepXmlSerializer, 'decorateDoTry');
      StepXmlSerializer.serialize('doTry', doTryEntity, getDocument());

      expect(decorateDoTrySpy).not.toHaveBeenCalled();
      decorateDoTrySpy.mockRestore();
    });
  });

  describe('Serialize EIP elements', () => {
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
      const resultString = normalizeLineEndings(XmlFormatter.formatXml(xmlSerializer.serializeToString(result)));
      const expectedString = normalizeLineEndings(XmlFormatter.formatXml(xmlSerializer.serializeToString(expected)));
      expect(resultString).toEqual(expectedString);
    });
  });

  describe('Test with simulated old catalog', () => {
    beforeAll(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      delete catalogsMap.modelCatalogMap['doTry'].properties.doCatch;
      delete catalogsMap.modelCatalogMap['doTry'].properties.doFinally;

      expect(catalogsMap.modelCatalogMap['doTry'].properties.doCatch).not.toBeDefined();
      CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    });

    it('should call decorateDoTry when doCatch and doFinally are not in the catalog', () => {
      const decorateDoTrySpy = jest.spyOn(StepXmlSerializer, 'decorateDoTry');
      const document = getDocument();
      StepXmlSerializer.serialize('doTry', doTryEntity, document);

      expect(decorateDoTrySpy).toHaveBeenCalledTimes(1);
      expect(decorateDoTrySpy).toHaveBeenCalledWith(
        expect.objectContaining(doTryEntity),
        expect.any(Element),
        document,
      );

      decorateDoTrySpy.mockRestore();
    });

    it('should decorate doTry element correctly', () => {
      const result = StepXmlSerializer.serialize('doTry', doTryEntity, getDocument());
      const doCatchElement = result.getElementsByTagName('doCatch')[0];

      expect(doCatchElement).toBeDefined();
      expect(doCatchElement.getElementsByTagName('to')[0].getAttribute('uri')).toBe('mock:catch');
    });
  });
});
