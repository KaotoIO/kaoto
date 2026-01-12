import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { parse, stringify } from 'yaml';

import { DynamicCatalogRegistry } from '../dynamic-catalog';
import { DynamicCatalog } from '../dynamic-catalog/dynamic-catalog';
import { ICatalogProvider } from '../dynamic-catalog/models';
import { CatalogKind } from '../models/catalog-kind';
import { CamelCatalogService } from '../models/visualization/flows';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { CamelComponentSorter } from './camel-component-sorter';

describe('CamelComponentSorter', () => {
  beforeAll(async () => {
    // Load all catalogs properly
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Set up CamelCatalogService (for getComponent calls)
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);

    // Set up DynamicCatalogRegistry (for CamelComponentSorter)
    const registry = DynamicCatalogRegistry.get();

    // Create providers for each catalog type
    const createProvider = <T>(catalogMap: Record<string, T>): ICatalogProvider<T> => ({
      id: 'test-provider',
      fetch: async (key: string) => catalogMap[key],
      fetchAll: async () => catalogMap,
    });

    registry.setCatalog(CatalogKind.Component, new DynamicCatalog(createProvider(catalogsMap.componentCatalogMap)));
    registry.setCatalog(CatalogKind.Processor, new DynamicCatalog(createProvider(catalogsMap.modelCatalogMap)));
    registry.setCatalog(CatalogKind.Pattern, new DynamicCatalog(createProvider(catalogsMap.patternCatalogMap)));
    registry.setCatalog(CatalogKind.Entity, new DynamicCatalog(createProvider(catalogsMap.entitiesCatalog)));
    registry.setCatalog(CatalogKind.Language, new DynamicCatalog(createProvider(catalogsMap.languageCatalog)));
    registry.setCatalog(CatalogKind.Kamelet, new DynamicCatalog(createProvider(catalogsMap.kameletsCatalogMap)));

    // Pre-populate the cache by fetching each catalog entry
    await Promise.all([
      ...Object.keys(catalogsMap.componentCatalogMap).map((key) => registry.getEntity(CatalogKind.Component, key)),
      ...Object.keys(catalogsMap.modelCatalogMap).map((key) => registry.getEntity(CatalogKind.Processor, key)),
      ...Object.keys(catalogsMap.patternCatalogMap).map((key) => registry.getEntity(CatalogKind.Pattern, key)),
      ...Object.keys(catalogsMap.entitiesCatalog).map((key) => registry.getEntity(CatalogKind.Entity, key)),
      ...Object.keys(catalogsMap.languageCatalog).map((key) => registry.getEntity(CatalogKind.Language, key)),
      ...Object.keys(catalogsMap.kameletsCatalogMap).map((key) => registry.getEntity(CatalogKind.Kamelet, key)),
    ]);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  describe('catalog verification', () => {
    it('should have catalogs loaded', () => {
      const routeCatalog = CamelCatalogService.getComponent(CatalogKind.Entity, 'route');
      expect(routeCatalog).toBeDefined();

      const fromCatalog = CamelCatalogService.getComponent(CatalogKind.Processor, 'from');
      expect(fromCatalog).toBeDefined();

      const timerCatalog = CamelCatalogService.getComponent(CatalogKind.Component, 'timer');
      expect(timerCatalog).toBeDefined();
    });

    it('should have language catalogs with index properties', () => {
      const simpleLang = CamelCatalogService.getComponent(CatalogKind.Language, 'simple');
      expect(simpleLang).toBeDefined();
      expect(simpleLang?.properties).toBeDefined();

      // Check from DynamicCatalogRegistry (used by sorter)
      const simpleLangFromRegistry = DynamicCatalogRegistry.get().getEntityFromCache(CatalogKind.Language, 'simple');
      console.log('Simple from registry:', JSON.stringify(simpleLangFromRegistry?.properties, null, 2));
      expect(simpleLangFromRegistry).toBeDefined();
      expect(simpleLangFromRegistry?.properties?.id?.index).toBe(0);
      expect(simpleLangFromRegistry?.properties?.expression?.index).toBe(1);
      expect(simpleLangFromRegistry?.properties?.resultType?.index).toBe(2);
    });
  });

  describe('sortProcessorObject', () => {
    it('should sort route properties by catalog index', () => {
      const unsortedRoute = {
        from: {
          uri: 'timer:test',
          steps: [],
        },
        description: 'A test route',
        id: 'test-route',
      };

      const sorted = CamelComponentSorter.sortProcessorObject('route', unsortedRoute);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort from processor properties', () => {
      const unsortedFrom = {
        steps: [],
        parameters: { timerName: 'test' },
        uri: 'timer:test',
        id: 'from-1',
      };

      const sorted = CamelComponentSorter.sortProcessorObject('from', unsortedFrom);
      const yaml = stringify({ from: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort timer component parameters by catalog index', () => {
      const unsortedFrom = {
        uri: 'timer:test',
        parameters: {
          repeatCount: 10,
          delay: 1000,
          period: 5000,
          timerName: 'myTimer',
        },
        steps: [],
      };

      const sorted = CamelComponentSorter.sortProcessorObject('from', unsortedFrom);
      const yaml = stringify({ from: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort log component parameters', () => {
      const unsortedTo = {
        uri: 'log:info',
        parameters: {
          showHeaders: true,
          loggerName: 'MyLogger',
          message: 'Hello',
          level: 'INFO',
        },
      };

      const sorted = CamelComponentSorter.sortProcessorObject('to', unsortedTo);
      const yaml = stringify({ to: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });
  });

  describe('sortCamelStep', () => {
    it('should sort a setHeader step', () => {
      const unsortedStep = {
        setHeader: {
          simple: '${body}',
          name: 'myHeader',
          id: 'header-1',
        },
      };

      const sorted = CamelComponentSorter.sortCamelStep(unsortedStep);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort a choice step with when and otherwise', () => {
      const unsortedStep = {
        choice: {
          otherwise: {
            steps: [{ log: { message: 'otherwise' } }],
          },
          when: [
            {
              steps: [{ log: { message: 'when' } }],
              simple: '${body} == 1',
            },
          ],
          id: 'choice-1',
        },
      };

      const sorted = CamelComponentSorter.sortCamelStep(unsortedStep);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should preserve step array order', () => {
      const stepsArray = [{ log: { message: 'step 1' } }, { to: { uri: 'direct:a' } }, { log: { message: 'step 2' } }];

      const processed = CamelComponentSorter.processArray('steps', stepsArray);
      const yaml = stringify(processed, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort expression language properties - simple expression object', () => {
      const unsortedStep = {
        setHeader: {
          simple: {
            resultType: 'java.lang.String',
            expression: '${body}',
            id: 'simple-1',
          },
          name: 'myHeader',
          id: 'header-1',
        },
      };

      const sorted = CamelComponentSorter.sortCamelStep(unsortedStep);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort expression language properties - constant expression object', () => {
      const unsortedStep = {
        setBody: {
          constant: {
            resultType: 'java.lang.String',
            expression: 'constant value',
            id: 'constant-1',
          },
          id: 'body-1',
        },
      };

      const sorted = CamelComponentSorter.sortCamelStep(unsortedStep);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort setHeaders with array of header expressions', () => {
      const unsortedStep = {
        setHeaders: {
          headers: [
            {
              name: 'header1',
              simple: {
                resultType: 'java.lang.String',
                expression: '${body.id}',
                id: 'simple-1',
              },
            },
            {
              name: 'header2',
              constant: {
                resultType: 'java.lang.String',
                expression: 'constant value',
                id: 'constant-1',
              },
            },
          ],
          id: 'headers-1',
        },
      };

      const sorted = CamelComponentSorter.sortCamelStep(unsortedStep);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });
  });

  describe('integration tests with real YAML routes', () => {
    it('should sort a complete unsorted route', () => {
      const unsortedYaml = `
- route:
    from:
      steps:
        - to:
            parameters:
              loggerName: InfoLogger
              message: "Processing"
            uri: log:info
        - setHeader:
            simple: "\${body}"
            name: myHeader
      parameters:
        delay: 1000
        timerName: myTimer
      uri: timer:test
    description: "Test route"
    id: test-route
`;

      const [routeObj] = parse(unsortedYaml);
      const sorted = CamelComponentSorter.sortProcessorObject('route', routeObj.route);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle choice with when/otherwise correctly', () => {
      const unsortedYaml = `
- route:
    id: choice-route
    from:
      uri: direct:start
      steps:
        - choice:
            otherwise:
              steps:
                - log:
                    message: "default case"
            when:
              - simple: "\${header.type} == 'A'"
                steps:
                  - log:
                      message: "Type A"
              - simple: "\${header.type} == 'B'"
                steps:
                  - log:
                      message: "Type B"
`;

      const parsed = parse(unsortedYaml);
      const routeObj = parsed[0];

      const sorted = CamelComponentSorter.sortProcessorObject('route', routeObj.route);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle doTry/doCatch/doFinally correctly', () => {
      const unsortedYaml = `
- route:
    id: error-route
    from:
      uri: direct:start
      steps:
        - doTry:
            doFinally:
              steps:
                - log:
                    message: "finally"
            doCatch:
              - exception:
                  - java.io.IOException
                steps:
                  - log:
                      message: "caught error"
            steps:
              - to:
                  uri: mock:test
`;

      const parsed = parse(unsortedYaml);
      const routeObj = parsed[0];

      const sorted = CamelComponentSorter.sortProcessorObject('route', routeObj.route);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should sort complete route and output valid YAML', () => {
      const unsortedYaml = `
- route:
    from:
      steps:
        - to:
            uri: log:info
            parameters:
              showHeaders: true
              message: "Hello World"
      uri: timer:test
      parameters:
        period: 5000
        timerName: myTimer
    description: "A simple timer route"
    id: timer-route
`;

      const parsed = parse(unsortedYaml);
      const routeObj = parsed[0];

      const sorted = CamelComponentSorter.sortProcessorObject('route', routeObj.route);

      // Convert back to YAML and verify it's valid
      const sortedYaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(() => parse(sortedYaml)).not.toThrow();

      // Snapshot the YAML output
      expect(sortedYaml).toMatchSnapshot();
    });
  });

  describe('edge cases', () => {
    it('should handle processors without catalog entries', () => {
      const unknownProcessor = {
        unknownProp: 'value',
        anotherProp: 'value2',
      };

      const sorted = CamelComponentSorter.sortProcessorObject('unknownProcessor', unknownProcessor);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle empty objects', () => {
      const empty = {};
      const sorted = CamelComponentSorter.sortProcessorObject('route', empty);
      const yaml = stringify(sorted, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle null and undefined values', () => {
      const withNulls = {
        id: 'test',
        description: null,
        uri: undefined,
        parameters: {},
      };

      const sorted = CamelComponentSorter.sortProcessorObject('from', withNulls);
      const yaml = stringify({ from: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle kamelet URIs', () => {
      const kameletFrom = {
        uri: 'kamelet:aws-s3-source',
        parameters: {
          bucketNameOrArn: 'my-bucket',
          region: 'us-east-1',
        },
        steps: [],
      };

      const sorted = CamelComponentSorter.sortProcessorObject('from', kameletFrom);
      const yaml = stringify({ from: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });

    it('should handle nested generic objects', () => {
      const nested = {
        id: 'test',
        metadata: {
          zProp: 'last',
          aProp: 'first',
          mProp: 'middle',
        },
      };

      const sorted = CamelComponentSorter.sortProcessorObject('route', nested);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through sort', () => {
      const original = {
        route: {
          id: 'original-route',
          description: 'Test route',
          from: {
            uri: 'timer:test',
            parameters: {
              timerName: 'myTimer',
              period: 1000,
              delay: 500,
            },
            steps: [
              {
                setHeader: {
                  name: 'header1',
                  simple: '${body}',
                },
              },
              {
                to: {
                  uri: 'log:info',
                  parameters: {
                    message: 'Processing',
                    level: 'INFO',
                  },
                },
              },
            ],
          },
        },
      };

      const sorted = CamelComponentSorter.sortProcessorObject('route', original.route);
      const yaml = stringify({ route: sorted }, { schema: 'yaml-1.1' });
      expect(yaml).toMatchSnapshot();
    });
  });
});
