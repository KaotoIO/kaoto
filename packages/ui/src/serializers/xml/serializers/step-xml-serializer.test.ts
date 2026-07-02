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

import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CamelComponentsProvider } from '../../../dynamic-catalog/providers/camel-components.provider';
import { CamelKameletsProvider } from '../../../dynamic-catalog/providers/camel-kamelets.provider';
import { CatalogKind } from '../../../models';
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
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
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
    setupDynamicCatalogRegistry(catalogsMap);
    domParser = new DOMParser();
    xmlSerializer = new XMLSerializer();
  });

  const STRING_STEP_DEFINITIONS_TEST_CASES = [
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
  it.each(STRING_STEP_DEFINITIONS_TEST_CASES)(
    'serializes $name with string definition',
    async ({ name, stepString, attributeName }) => {
      const step = stepString as unknown as ElementType;

      const result = await StepXmlSerializer.serialize(name, step, getDocument());

      expect(result.tagName).toBe(name);
      expect(result.getAttribute(attributeName)).toBe(stepString);
    },
  );

  it('serializes a to step with URI', async () => {
    const toStep = {
      uri: 'file:output',
      parameters: {
        fileName: 'output.txt',
        directoryName: 'output',
        fileExist: 'Append',
      },
    };

    const result = await StepXmlSerializer.serialize('to', toStep, getDocument());
    expect(result.tagName).toBe('to');
    expect(result.getAttribute('uri')).toBe('file:output?fileName=output.txt&fileExist=Append');
  });

  it('serializes a step with attributes', async () => {
    const logStep = {
      message: 'Hello World',
      logName: 'testLogger',
    };

    const result = await StepXmlSerializer.serialize('log', logStep, getDocument());
    expect(result.tagName).toBe('log');
    expect(result.getAttribute('message')).toBe('Hello World');
    expect(result.getAttribute('logName')).toBe('testLogger');
  });

  it('serializes a step with nested elements', async () => {
    const parentStep = {
      steps: [{ to: { uri: 'direct:first' } }, { to: { uri: 'direct:second' } }],
    };

    const result = await StepXmlSerializer.serialize('route', parentStep, getDocument());
    expect(result.tagName).toBe('route');
    expect(result.children).toHaveLength(2);
    expect(result.children[0].tagName).toBe('to');
    expect(result.children[0].getAttribute('uri')).toBe('direct:first');
    expect(result.children[1].tagName).toBe('to');
    expect(result.children[1].getAttribute('uri')).toBe('direct:second');
  });

  it('creates URI from component parameters correctly', async () => {
    const fileStep = {
      uri: 'file:data',
      parameters: {
        noop: true,
        recursive: true,
        delete: false,
      },
    };

    const result = await StepXmlSerializer.serialize('from', fileStep, getDocument());
    expect(result.tagName).toBe('from');
    expect(result.getAttribute('uri')).toBe('file:data?noop=true&recursive=true&delete=false');
  });

  it('creates URI from kamelet parameters correctly', async () => {
    const kameletStep = {
      uri: 'kamelet:log-action',
      parameters: {
        level: 'DEBUG',
        multiline: true,
        showHeaders: false,
      },
    };

    const result = await StepXmlSerializer.serialize('from', kameletStep, getDocument());
    expect(result.tagName).toBe('from');
    expect(result.getAttribute('uri')).toBe('kamelet:log-action?level=DEBUG&multiline=true&showHeaders=false');
  });

  it('should not call decorateDoTry when doCatch and doFinally are in the catalog', () => {
    const decorateDoTrySpy = vi.spyOn(StepXmlSerializer, 'decorateDoTry');
    void StepXmlSerializer.serialize('doTry', doTryEntity as unknown as ElementType, getDocument());

    expect(decorateDoTrySpy).not.toHaveBeenCalled();
    decorateDoTrySpy.mockRestore();
  });

  const EIP_DEFINITIONS_TEST_CASES = [
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
  it.each(EIP_DEFINITIONS_TEST_CASES)('Parse $name', async ({ name, xml, entity }) => {
    const document = domParser.parseFromString('', 'application/xml');
    const result = await StepXmlSerializer.serialize(name, entity as unknown as ElementType, document);
    const expected = domParser.parseFromString(xml, 'application/xml').documentElement;
    const resultString = normalizeLineEndings(XmlFormatter.formatXml(xmlSerializer.serializeToString(result)));
    const expectedString = normalizeLineEndings(XmlFormatter.formatXml(xmlSerializer.serializeToString(expected)));
    expect(resultString).toEqual(expectedString);
  });

  describe('Test with simulated old catalog', () => {
    beforeAll(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      delete catalogsMap.modelCatalogMap['doTry'].properties.doCatch;
      delete catalogsMap.modelCatalogMap['doTry'].properties.doFinally;

      expect(catalogsMap.modelCatalogMap['doTry'].properties.doCatch).toBeUndefined();
      setupDynamicCatalogRegistry(catalogsMap);
    });

    it('should call decorateDoTry when doCatch and doFinally are not in the catalog', async () => {
      const decorateDoTrySpy = vi.spyOn(StepXmlSerializer, 'decorateDoTry');
      const document = getDocument();
      await StepXmlSerializer.serialize('doTry', doTryEntity as unknown as ElementType, document);

      expect(decorateDoTrySpy).toHaveBeenCalledTimes(1);
      expect(decorateDoTrySpy).toHaveBeenCalledWith(
        expect.objectContaining(doTryEntity),
        expect.any(Element),
        document,
      );

      decorateDoTrySpy.mockRestore();
    });

    it('should decorate doTry element correctly', async () => {
      const result = await StepXmlSerializer.serialize('doTry', doTryEntity as unknown as ElementType, getDocument());
      const doCatchElement = result.getElementsByTagName('doCatch')[0];

      expect(doCatchElement).toBeDefined();
      expect(doCatchElement.getElementsByTagName('to')[0].getAttribute('uri')).toBe('mock:catch');
    });
  });

  it('should serialize unknown type with non-object value', async () => {
    const unknownStep = {
      someAttribute: 'value',
      anotherAttribute: 123,
    };

    const result = await StepXmlSerializer.serialize('unknownProcessor', unknownStep, getDocument());

    expect(result.tagName).toBe('unknownProcessor');
    expect(result.getAttribute('someAttribute')).toBe('value');
    expect(result.getAttribute('anotherAttribute')).toBe('123');
  });

  it('should serialize object type with javaType string', async () => {
    const step = {
      name: 'myHeader',
      expression: {
        constant: {
          expression: 'test value',
        },
      },
    };

    const result = await StepXmlSerializer.serialize('setHeader', step, getDocument());

    expect(result.tagName).toBe('setHeader');
    expect(result.getAttribute('name')).toBe('myHeader');
    const constantElement = result.getElementsByTagName('constant')[0];
    expect(constantElement).toBeDefined();
    expect(constantElement.textContent).toBe('test value');
  });

  it('should handle saga with compensation as attribute in catalog', async () => {
    const sagaStep = {
      compensation: 'direct:compensation',
      completion: 'direct:completion',
    };

    const result = await StepXmlSerializer.serialize('saga', sagaStep, getDocument());

    expect(result.tagName).toBe('saga');
    expect(result.getAttribute('compensation')).toBe('direct:compensation');
    expect(result.getAttribute('completion')).toBe('direct:completion');
    // Should not have nested elements when attributes are in catalog
    expect(result.getElementsByTagName('compensation')).toHaveLength(0);
    expect(result.getElementsByTagName('completion')).toHaveLength(0);
  });

  it('should serialize saga with nested elements when not attributes in old catalog', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    // Simulate old catalog where compensation/completion are not attributes
    const originalSagaProps = { ...catalogsMap.modelCatalogMap['saga'].properties };
    delete catalogsMap.modelCatalogMap['saga'].properties.compensation;
    delete catalogsMap.modelCatalogMap['saga'].properties.completion;
    setupDynamicCatalogRegistry(catalogsMap);

    const sagaStep = {
      compensation: 'direct:compensation',
      completion: 'direct:completion',
    };

    const result = await StepXmlSerializer.serialize('saga', sagaStep, getDocument());

    expect(result.tagName).toBe('saga');
    const compensationElement = result.getElementsByTagName('compensation')[0];
    const completionElement = result.getElementsByTagName('completion')[0];
    expect(compensationElement).toBeDefined();
    expect(compensationElement.getAttribute('uri')).toBe('direct:compensation');
    expect(completionElement).toBeDefined();
    expect(completionElement.getAttribute('uri')).toBe('direct:completion');

    // Restore original properties
    catalogsMap.modelCatalogMap['saga'].properties = originalSagaProps;
    setupDynamicCatalogRegistry(catalogsMap);
  });

  it('should serialize saga nested elements when compensation/completion are legacy object-shaped values', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    // Simulate old catalog where compensation/completion are not attributes
    const originalSagaProps = { ...catalogsMap.modelCatalogMap['saga'].properties };
    delete catalogsMap.modelCatalogMap['saga'].properties.compensation;
    delete catalogsMap.modelCatalogMap['saga'].properties.completion;
    setupDynamicCatalogRegistry(catalogsMap);

    // Legacy model represented these as { uri } objects rather than plain strings
    const sagaStep = {
      compensation: { uri: 'direct:compensation' },
      completion: { uri: 'direct:completion' },
    } as unknown as Parameters<typeof StepXmlSerializer.serialize>[1];

    const result = await StepXmlSerializer.serialize('saga', sagaStep, getDocument());

    const compensationElement = result.getElementsByTagName('compensation')[0];
    const completionElement = result.getElementsByTagName('completion')[0];
    expect(compensationElement.getAttribute('uri')).toBe('direct:compensation');
    expect(completionElement.getAttribute('uri')).toBe('direct:completion');

    // Restore original properties
    catalogsMap.modelCatalogMap['saga'].properties = originalSagaProps;
    setupDynamicCatalogRegistry(catalogsMap);
  });

  describe('serializeTextType (element kind with javaType java.lang.String)', () => {
    it('serializes an element-kind String property as a child text element', async () => {
      // beanFactory.script has kind=element, javaType=java.lang.String in the real catalog
      const beanStep = {
        name: 'myBean',
        type: 'com.example.MyBean',
        script: 'return body;',
      };

      const result = await StepXmlSerializer.serialize('beanFactory', beanStep, getDocument());

      expect(result.tagName).toBe('beanFactory');
      const scriptEl = result.getElementsByTagName('script')[0];
      expect(scriptEl).toBeDefined();
      expect(scriptEl.textContent).toBe('return body;');
    });

    it('does not create script child element when script is absent', async () => {
      const beanStep = { name: 'myBean', type: 'com.example.MyBean' };

      const result = await StepXmlSerializer.serialize('beanFactory', beanStep, getDocument());

      expect(result.getElementsByTagName('script')).toHaveLength(0);
    });
  });

  it('serializes exception list as individual string child elements', async () => {
    // doCatch has `exception` with javaType=java.util.List<java.lang.String>, kind=element
    const doCatchStep = {
      exception: ['java.lang.RuntimeException', 'java.io.IOException'],
      steps: [],
    };

    const result = await StepXmlSerializer.serialize('doCatch', doCatchStep, getDocument());

    const exceptionEls = result.getElementsByTagName('exception');
    expect(exceptionEls).toHaveLength(2);
    expect(exceptionEls[0].textContent).toBe('java.lang.RuntimeException');
    expect(exceptionEls[1].textContent).toBe('java.io.IOException');
  });

  it('does not serialize Map-typed element properties', async () => {
    // beanFactory has `properties` with javaType=java.util.Map<java.lang.String, java.lang.Object>
    const beanStep = {
      name: 'myBean',
      type: 'com.example.MyBean',
      properties: { key1: 'value1' },
    };

    const result = await StepXmlSerializer.serialize('beanFactory', beanStep, getDocument());

    expect(result.tagName).toBe('beanFactory');
    expect(result.getAttribute('name')).toBe('myBean');
    // The Map property must not be serialized as a child element
    expect(result.getElementsByTagName('properties')).toHaveLength(0);
  });

  describe('serializeSteps edge cases', () => {
    it('returns empty array for undefined steps', async () => {
      const result = await StepXmlSerializer.serializeSteps(undefined as unknown as ElementType[], getDocument());

      expect(result).toEqual([]);
    });

    it('skips null/undefined entries inside the steps array', async () => {
      const steps = [null, undefined, { to: { uri: 'direct:valid' } }] as unknown as ElementType[];

      const result = await StepXmlSerializer.serializeSteps(steps, getDocument());

      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('to');
      expect(result[0].getAttribute('uri')).toBe('direct:valid');
    });
  });

  describe('createUriFromParameters', () => {
    it('should return uri when componentName is undefined', async () => {
      const step = {
        uri: 'unknown:component',
      };

      const result = await StepXmlSerializer.createUriFromParameters(step);

      expect(result).toBe('unknown:component');
    });

    it('returns plain uri when kamelet definition exists but has no parameters', async () => {
      // kamelet is present in catalog, no parameters → returns bare URI
      const step = { uri: 'kamelet:log-action' };

      const result = await StepXmlSerializer.createUriFromParameters(step);

      expect(result).toBe('kamelet:log-action');
    });

    it('uses kamelet component syntax when kamelet name is not in the Kamelet catalog', async () => {
      // Use a kamelet: URI whose name does not exist in the Kamelet catalog.
      // The code falls through to the `kamelet` Component which has syntax kamelet:templateId/routeId.
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      // Remove the specific kamelet to force fallback to the kamelet component
      const originalKameletsCatalog = { ...catalogsMap.kameletsCatalogMap };
      delete catalogsMap.kameletsCatalogMap['log-action'];
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Kamelet,
        new DynamicCatalog(new CamelKameletsProvider(catalogsMap.kameletsCatalogMap)),
      );

      const step = {
        uri: 'kamelet:log-action',
        parameters: { level: 'DEBUG' },
      };

      const result = await StepXmlSerializer.createUriFromParameters(step);

      // The kamelet component syntax resolves templateId/routeId from parameters;
      // since neither key is in our parameters the path still appends query params.
      expect(result).toContain('level=DEBUG');

      // Restore
      catalogsMap.kameletsCatalogMap = originalKameletsCatalog;
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Kamelet,
        new DynamicCatalog(new CamelKameletsProvider(catalogsMap.kameletsCatalogMap)),
      );
    });

    it('uses fallback getUriStringFromParameters when component has no syntax but step has parameters', async () => {
      // Mutate the file component's syntax in-place to undefined to trigger the fallback at line 271
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      const fileComponent = catalogsMap.componentCatalogMap['file'].component;
      const originalSyntax = fileComponent.syntax;
      (fileComponent as unknown as Record<string, unknown>).syntax = undefined;
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Component,
        new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap)),
      );

      const step = {
        uri: 'file:data',
        parameters: { noop: true },
      };

      const result = await StepXmlSerializer.createUriFromParameters(step);

      expect(result).toContain('file:data');
      expect(result).toContain('noop=true');

      // Restore
      (fileComponent as unknown as Record<string, unknown>).syntax = originalSyntax;
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Component,
        new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap)),
      );
    });

    it('returns bare uri when component has no syntax and step has no parameters', async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      const fileComponent = catalogsMap.componentCatalogMap['file'].component;
      const originalSyntax = fileComponent.syntax;
      (fileComponent as unknown as Record<string, unknown>).syntax = undefined;
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Component,
        new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap)),
      );

      const step = { uri: 'file:data' };

      const result = await StepXmlSerializer.createUriFromParameters(step);

      expect(result).toBe('file:data');

      // Restore
      (fileComponent as unknown as Record<string, unknown>).syntax = originalSyntax;
      DynamicCatalogRegistry.get().setCatalog(
        CatalogKind.Component,
        new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap)),
      );
    });
  });

  it('serializes loadBalance by finding the matching oneOf key when the primary key is absent', async () => {
    // `loadBalance` has `loadBalancerType` with oneOf: [customLoadBalancer, failoverLoadBalancer, ...]
    // When processor.loadBalancerType is undefined but processor.customLoadBalancer is set,
    // the oneOf lookup branch is exercised.
    const loadBalanceStep = {
      customLoadBalancer: { ref: 'myBalancer' },
    };

    const result = await StepXmlSerializer.serialize('loadBalance', loadBalanceStep, getDocument());

    expect(result.tagName).toBe('loadBalance');
    expect(result.getElementsByTagName('customLoadBalancer')).toHaveLength(1);
  });

  it('unwraps a self-nested element before serializing', async () => {
    // When camelElement[elementName] exists, the code reassigns camelElement to the nested value.
    // Simulate this: serialize 'log' but pass { log: { message: 'nested' } }
    const step = { log: { message: 'nested' } } as unknown as ElementType;

    const result = await StepXmlSerializer.serialize('log', step, getDocument());

    expect(result.tagName).toBe('log');
    expect(result.getAttribute('message')).toBe('nested');
  });

  it('serializes unknown type with an object-valued child as a nested element', async () => {
    // Exercises the typeof value === 'object' branch in serializeUnknownType (line 102-103):
    // when a processor has no catalog definition and one of its values is itself an object,
    // it must be recursed into as a child element rather than stringified as an attribute.
    const unknownStep = {
      primitiveAttr: 'hello',
      nestedObj: { innerAttr: 'world' },
    };

    const result = await StepXmlSerializer.serialize(
      'unknownProcessor',
      unknownStep as unknown as ElementType,
      getDocument(),
    );

    expect(result.tagName).toBe('unknownProcessor');
    expect(result.getAttribute('primitiveAttr')).toBe('hello');
    const nested = result.getElementsByTagName('nestedObj')[0];
    expect(nested).toBeDefined();
    expect(nested.getAttribute('innerAttr')).toBe('world');
  });

  it('wraps allowableValues children inside a parent element when childName differs from key', async () => {
    // Exercises the childName !== key branch in serializeArrayType (lines 164-166):
    // ARRAY_TYPE_NAMES maps 'allowableValues' → 'value', so the array items are serialized
    // as <value> children wrapped inside an <allowableValues> container element.
    // `param` is the real catalog processor that exposes this property.
    const paramStep = {
      name: 'myParam',
      allowableValues: ['one', 'two', 'three'],
    };

    const result = await StepXmlSerializer.serialize('param', paramStep as unknown as ElementType, getDocument());

    expect(result.tagName).toBe('param');
    const container = result.getElementsByTagName('allowableValues')[0];
    expect(container).toBeDefined();
    const valueEls = container.getElementsByTagName('value');
    expect(valueEls).toHaveLength(3);
    expect(valueEls[0].textContent).toBe('one');
    expect(valueEls[1].textContent).toBe('two');
    expect(valueEls[2].textContent).toBe('three');
  });
});
