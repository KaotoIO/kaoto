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

import { describe } from 'node:test';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { StepParser } from './step-parser';
import { getElementFromXml } from './route-xml-parser.test';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogLibrary, DoTry } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind, ICamelProcessorProperty } from '../../../models';
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
describe('parser basics', () => {
  let mockDocument: Document;
  let spyComponent: jest.SpyInstance;

  beforeEach(() => {
    mockDocument = document.implementation.createDocument(null, null, null);
    spyComponent = jest.spyOn(CamelCatalogService, 'getComponent');
  });

  afterEach(() => {
    jest.clearAllMocks();
    spyComponent.mockRestore();
  });

  describe('parseSteps', () => {
    it('should parse simple processor steps', () => {
      const parent = mockDocument.createElement('route');
      const log = mockDocument.createElement('log');
      log.setAttribute('message', 'Hello');
      parent.appendChild(log);

      const processorKeys = ['log'];

      const result = StepParser.parseSteps(parent, processorKeys);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('log');
      expect(result[0].log).toHaveProperty('message', 'Hello');
    });

    it('should skip elements in SKIP_KEYS', () => {
      const parent = mockDocument.createElement('route');
      const doCatch = mockDocument.createElement('doCatch');
      parent.appendChild(doCatch);

      const processorKeys = ['doCatch'];

      const result = StepParser.parseSteps(parent, processorKeys);

      expect(result).toHaveLength(0);
    });
  });

  describe('parseElement', () => {
    it('should parse element with attributes', () => {
      const element = mockDocument.createElement('log');
      element.setAttribute('message', 'test');

      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: {
          message: { kind: 'attribute' },
        },
      });

      const result = StepParser.parseElement(element);
      expect(result).toHaveProperty('message', 'test');
    });

    it('should handle undefined element', () => {
      const result = StepParser.parseElement(undefined as unknown as Element);
      expect(result).toEqual({});
    });

    it('should parse element with expression', () => {
      const element = mockDocument.createElement('choice');
      const when = mockDocument.createElement('when');
      element.appendChild(when);

      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: {
          when: {
            kind: 'expression',
            type: 'object',
          },
        },
      });

      const result = StepParser.parseElement(element);
      expect(result).toHaveProperty('when');
    });
  });

  describe('parseElementType', () => {
    it('should parse object type element', () => {
      const element = mockDocument.createElement('choice');
      const when = mockDocument.createElement('when');
      element.appendChild(when);

      const properties = {
        type: 'object' as const,
        oneOf: ['when'],
      } as unknown as ICamelProcessorProperty;

      const result = StepParser.parseElementType('when', element, properties);
      expect(result).toBeDefined();
      expect(result?.key).toBe('when');
    });

    it('should parse array type element', () => {
      const element = mockDocument.createElement('choice');
      const when1 = mockDocument.createElement('when');
      const when2 = mockDocument.createElement('when');
      element.appendChild(when1);
      element.appendChild(when2);

      const properties = {
        type: 'array' as const,
        oneOf: ['when'],
      } as unknown as ICamelProcessorProperty;

      const result = StepParser.parseElementType('when', element, properties);
      expect(result).toBeDefined();
      expect(Array.isArray(result?.value)).toBe(true);
    });
  });

  describe('decorateDoTry', () => {
    it('should properly decorate doTry element with doCatch and doFinally', () => {
      const doTryElement = mockDocument.createElement('doTry');
      const doCatch = mockDocument.createElement('doCatch');
      const doFinally = mockDocument.createElement('doFinally');

      doTryElement.appendChild(doCatch);
      doTryElement.appendChild(doFinally);

      const processor = {} as DoTry;

      StepParser.decorateDoTry(doTryElement, processor);

      expect(processor.doCatch).toBeDefined();
      expect(Array.isArray(processor.doCatch)).toBe(true);
      expect(processor.doFinally).toBeDefined();
    });

    it('should handle doTry without doCatch or doFinally', () => {
      const doTryElement = mockDocument.createElement('doTry');
      const processor = {} as DoTry;

      StepParser.decorateDoTry(doTryElement, processor);

      expect(processor.doCatch).toEqual([]);
      expect(processor.doFinally).toBeUndefined();
    });
  });

  describe('special cases', () => {
    it('should handle intercept elements', () => {
      const interceptElement = mockDocument.createElement('interceptFrom');
      const whenElement = mockDocument.createElement('when');
      interceptElement.appendChild(whenElement);

      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue({
        properties: {},
      });

      const result = StepParser.parseElement(interceptElement) as { when?: unknown };
      expect(result.when).toBeDefined();
    });

    it('should handle missing catalog entries', () => {
      const unknownElement = mockDocument.createElement('unknownProcessor');
      unknownElement.setAttribute('someAttr', 'value');

      (CamelCatalogService.getComponent as jest.Mock).mockReturnValue(null);

      const result = StepParser.parseElement(unknownElement) as { someAttr?: string };
      expect(result.someAttr).toBe('value');
    });
  });

  describe('parseElementsArray', () => {
    it('should parse array of string elements', () => {
      const parent = mockDocument.createElement('parent');
      const child1 = mockDocument.createElement('item');
      const child2 = mockDocument.createElement('item');
      child1.textContent = 'value1';
      child2.textContent = 'value2';
      parent.appendChild(child1);
      parent.appendChild(child2);

      const properties = {
        javaType: 'java.util.List<java.lang.String>',
      } as unknown as ICamelProcessorProperty;

      const result = StepParser.parseElementsArray('item', parent, properties);
      expect(result).toEqual(['value1', 'value2']);
    });

    it('should use transformer if provided', () => {
      const parent = mockDocument.createElement('parent');
      const child = mockDocument.createElement('item');
      parent.appendChild(child);

      const transformer = jest.fn().mockReturnValue({ transformed: true });
      const properties = {} as unknown as ICamelProcessorProperty;

      StepParser.parseElementsArray('item', parent, properties, transformer);
      expect(transformer).toHaveBeenCalledWith(child);
    });
  });
});

describe('ProcessorParser', () => {
  beforeAll(async () => {
    jest.resetAllMocks();
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it('transforms onException element correctly', () => {
    const onExceptionElement = getElementFromXml(`
    <onException>
      <exception>java.lang.Exception</exception>
      <handled>
        <constant>true</constant>
      </handled>
      <to uri="mock:error"/>
    </onException>
  `);

    const result = StepParser.parseElement(onExceptionElement);
    expect(result).toEqual({
      exception: ['java.lang.Exception'],
      handled: { constant: { expression: 'true' } },
      steps: [{ to: { uri: 'mock:error' } }],
    });
  });

  it('transforms onCompletion element correctly', () => {
    const onCompletionElement = getElementFromXml(`
    <onCompletion>
      <to uri="mock:completion"/>
    </onCompletion>
  `);

    const result = StepParser.parseElement(onCompletionElement);
    expect(result).toEqual({
      steps: [{ to: { uri: 'mock:completion' } }],
    });
  });

  it('transforms choice element correctly', () => {
    const choiceElement = getElementFromXml(`
    <choice>
      <when>
        <simple>\${header.foo} == 'bar'</simple>
        <to uri="mock:when"/>
      </when>
      <otherwise>
        <to uri="mock:otherwise"/>
      </otherwise>
    </choice>
  `);

    const result = StepParser.parseElement(choiceElement);
    expect(result).toEqual({
      when: [
        {
          expression: { simple: { expression: "${header.foo} == 'bar'" } },
          steps: [{ to: { uri: 'mock:when' } }],
        },
      ],
      otherwise: {
        steps: [{ to: { uri: 'mock:otherwise' } }],
      },
    });
  });
});

describe('Route EIPs xml parsing', () => {
  let transformElement: (element: string) => unknown;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);

    transformElement = (element: string) => {
      const xmlDoc = getElementFromXml(element);
      return StepParser.parseElement(xmlDoc);
    };
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
    { name: 'deadLetterChannel', xml: deadLetterChannelXml, entity: deadLetterChannelEntity },
    { name: 'enrich', xml: enrichXml, entity: enrichEntity },
    { name: 'dynamicRouter', xml: dynamicRouterXml, entity: dynamicRouterEntity },
    { name: 'recipientList', xml: recipientListXml, entity: recipientListEntity },
    { name: 'routingSlip', xml: routingSlipXml, entity: routingSlipEntity },
    { name: 'throttle', xml: throttleXml, entity: throttleEntity },
  ];

  it.each(testCases)('Parse $name', ({ xml, entity }) => {
    const result = transformElement(xml);
    expect(result).toEqual(entity);
  });
});
