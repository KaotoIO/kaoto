import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { parse, stringify } from 'yaml';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { ICatalogProvider } from '../../../dynamic-catalog/models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelErrorHandlerVisualEntity } from './camel-error-handler-visual-entity';
import { CamelInterceptFromVisualEntity } from './camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from './camel-intercept-send-to-endpoint-visual-entity';
import { CamelInterceptVisualEntity } from './camel-intercept-visual-entity';
import { CamelOnCompletionVisualEntity } from './camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from './camel-on-exception-visual-entity';
import { CamelRestConfigurationVisualEntity } from './camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from './camel-rest-visual-entity';
import { CamelRouteConfigurationVisualEntity } from './camel-route-configuration-visual-entity';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { KameletVisualEntity } from './kamelet-visual-entity';

/**
 * These tests verify that each visual entity's toJSON() method properly sorts
 * properties using the CamelComponentSorter, which orders properties according
 * to the Camel Catalog index.
 *
 * Each test:
 * 1. Parses an intentionally unsorted YAML definition
 * 2. Creates an entity and calls toJSON() to get the sorted output
 * 3. Compares the result to a snapshot to verify consistent sorting
 */
describe('Visual Entity Sorting - toJSON()', () => {
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

  describe('CamelRouteVisualEntity', () => {
    it('should sort a simple route with unsorted properties', () => {
      // Properties intentionally in wrong order (description before id, steps before uri)
      const unsortedYaml = `
route:
  from:
    steps:
      - log:
          message: Hello
          id: log-1
    parameters:
      period: 1000
      timerName: test
    uri: timer:tick
    id: from-1
  description: A test route
  id: route-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('simple-route-sorted');
    });

    it('should sort a route with choice/when/otherwise', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - choice:
          otherwise:
            steps:
              - log:
                  message: default
          when:
            - steps:
                - log:
                    message: option A
              simple: "\${header.type} == 'A'"
              id: when-1
            - steps:
                - log:
                    message: option B
              simple: "\${header.type} == 'B'"
              id: when-2
          id: choice-1
  id: choice-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-choice-sorted');
    });

    it('should sort a route with doTry/doCatch/doFinally', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - doTry:
          doFinally:
            steps:
              - log:
                  message: finally block
          doCatch:
            - steps:
                - log:
                    message: caught error
              exception:
                - java.io.IOException
              id: catch-1
          steps:
            - to:
                uri: mock:risky
          id: try-1
  id: error-handling-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-doTry-sorted');
    });

    it('should sort a route with component parameters', () => {
      const unsortedYaml = `
route:
  from:
    steps:
      - to:
          parameters:
            showHeaders: true
            loggerName: MyLogger
            level: INFO
            message: "Processing \${body}"
          uri: log:info
          id: to-log
    parameters:
      repeatCount: 10
      delay: 1000
      period: 5000
      timerName: myTimer
    uri: timer:test
  description: Route with component parameters
  id: params-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-component-params-sorted');
    });

    it('should sort a route with circuitBreaker/onFallback', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - circuitBreaker:
          onFallback:
            steps:
              - log:
                  message: fallback executed
            id: fallback-1
          steps:
            - to:
                uri: http:unstable-service
          resilience4jConfiguration:
            failureRateThreshold: 50
            minimumNumberOfCalls: 5
          id: cb-1
  id: circuit-breaker-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-circuitBreaker-sorted');
    });

    it('should sort a route with setHeader and setBody', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - setHeader:
          simple: "\${body}"
          name: myHeader
          id: header-1
      - setBody:
          simple: "Transformed: \${body}"
          id: body-1
  id: transform-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-setHeader-setBody-sorted');
    });

    it('should sort a route with setHeaders containing expression objects', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - setHeaders:
          headers:
            - name: "header1"
              simple:
                resultType: java.lang.String
                expression: "\${body.id}"
                id: simple-1
            - name: "header2"
              constant:
                resultType: java.lang.String
                expression: "constant value"
                id: constant-1
          id: headers-1
  id: expression-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      // Verify expressions are sorted by catalog index (resultType=0, expression=1, id=2)
      const headers = (result.route.from?.steps?.[0] as { setHeaders: { headers: unknown[] } }).setHeaders.headers;
      expect(headers).toHaveLength(2);

      const firstHeader = headers[0] as { simple: { id: string; expression: string; resultType: string } };
      expect(Object.keys(firstHeader.simple)).toEqual(['resultType', 'expression', 'id']);

      const secondHeader = headers[1] as { constant: { id: string; expression: string; resultType: string } };
      expect(Object.keys(secondHeader.constant)).toEqual(['resultType', 'expression', 'id']);

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot(
        'route-with-setHeaders-expression-objects-sorted',
      );
    });

    it('should sort from properties with nested expression objects', () => {
      const unsortedYaml = `
route:
  from:
    steps:
      - setBody:
          constant:
            resultType: java.lang.String
            expression: "test"
            id: const-1
          id: body-1
    uri: timer:test
    parameters:
      period: 1000
      timerName: test
    id: from-1
  description: Test from sorting
  id: from-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      // Verify from properties are sorted correctly
      expect(Object.keys(result.route.from || {})).toEqual(['id', 'uri', 'parameters', 'steps']);

      // Verify constant expression is sorted by catalog index (resultType=0, expression=1, id=2)
      const setBodyStep = (result.route.from?.steps?.[0] as { setBody: { constant: unknown } }).setBody;
      expect(Object.keys(setBodyStep.constant as object)).toEqual(['resultType', 'expression', 'id']);

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-with-from-expression-sorted');
    });

    it('should preserve array order while sorting object properties', () => {
      const unsortedYaml = `
route:
  from:
    uri: direct:start
    steps:
      - log:
          message: Step 1
          id: log-1
      - log:
          message: Step 2
          id: log-2
      - log:
          message: Step 3
          id: log-3
  id: array-order-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      // Verify array order is preserved
      expect(result.route.from?.steps?.[0]).toHaveProperty('log');
      expect((result.route.from?.steps?.[0] as { log: { message: string } }).log.message).toBe('Step 1');
      expect((result.route.from?.steps?.[1] as { log: { message: string } }).log.message).toBe('Step 2');
      expect((result.route.from?.steps?.[2] as { log: { message: string } }).log.message).toBe('Step 3');

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('route-array-order-preserved');
    });
  });

  describe('CamelOnExceptionVisualEntity', () => {
    it('should sort onException properties', () => {
      const unsortedYaml = `
onException:
  steps:
    - log:
        message: Exception handled
        id: log-exc
  redeliveryPolicy:
    maximumRedeliveries: 3
    redeliveryDelay: 1000
  handled:
    constant: "true"
  exception:
    - java.io.IOException
    - java.lang.RuntimeException
  description: Handle IO exceptions
  id: onException-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelOnExceptionVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('onException-sorted');
    });

    it('should sort onException with onWhen clause', () => {
      const unsortedYaml = `
onException:
  steps:
    - log:
        message: Conditional exception
  onWhen:
    simple: "\${exception.message} contains 'critical'"
  exception:
    - java.lang.Exception
  id: onException-when
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelOnExceptionVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('onException-with-onWhen-sorted');
    });
  });

  describe('CamelRouteConfigurationVisualEntity', () => {
    it('should sort routeConfiguration properties', () => {
      const unsortedYaml = `
routeConfiguration:
  onException:
    - exception:
        - java.lang.Exception
      steps:
        - log:
            message: Global exception
      id: global-exc
  intercept:
    - steps:
        - log:
            message: Intercepted
      id: intercept-1
  onCompletion:
    - steps:
        - log:
            message: Completed
      id: completion-1
  description: Global route configuration
  id: routeConfig-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteConfigurationVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('routeConfiguration-sorted');
    });

    it('should sort routeConfiguration with interceptFrom', () => {
      const unsortedYaml = `
routeConfiguration:
  interceptFrom:
    - steps:
        - log:
            message: Intercepted from
      uri: "direct:*"
      id: interceptFrom-1
  id: routeConfig-interceptFrom
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteConfigurationVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('routeConfiguration-with-interceptFrom-sorted');
    });
  });

  describe('CamelRestVisualEntity', () => {
    it('should sort rest properties', () => {
      const unsortedYaml = `
rest:
  get:
    - to:
        uri: direct:hello
      path: /hello
      id: get-hello
  post:
    - to:
        uri: direct:create
      path: /create
      consumes: application/json
      id: post-create
  bindingMode: auto
  path: /api
  description: REST API
  id: rest-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRestVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('rest-sorted');
    });

    it('should sort rest with security definitions', () => {
      const unsortedYaml = `
rest:
  get:
    - to:
        uri: direct:secure
      security:
        - key: oauth2
          scopes: read
      path: /secure
      id: get-secure
  securityDefinitions:
    oauth2:
      key: oauth2
      flow: application
      tokenUrl: https://auth.example.com/token
  path: /api/v2
  id: rest-secure
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRestVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('rest-with-security-sorted');
    });
  });

  describe('CamelRestConfigurationVisualEntity', () => {
    it('should sort restConfiguration properties', () => {
      const unsortedYaml = `
restConfiguration:
  port: "8080"
  hostNameResolver: allLocalIp
  component: platform-http
  bindingMode: auto
  apiComponent: openapi
  producerComponent: vertx-http
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRestConfigurationVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('restConfiguration-sorted');
    });

    it('should sort restConfiguration with CORS and properties', () => {
      const unsortedYaml = `
restConfiguration:
  corsHeaders:
    - key: Access-Control-Allow-Origin
      value: "*"
  enableCORS: true
  componentProperty:
    - key: maxThreads
      value: "10"
  component: jetty
  port: "9090"
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRestConfigurationVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('restConfiguration-with-cors-sorted');
    });
  });

  describe('CamelInterceptVisualEntity', () => {
    it('should sort intercept properties', () => {
      const unsortedYaml = `
intercept:
  steps:
    - log:
        message: Intercepting...
        id: log-intercept
  description: Global intercept
  id: intercept-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelInterceptVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('intercept-sorted');
    });
  });

  describe('CamelInterceptFromVisualEntity', () => {
    it('should sort interceptFrom properties', () => {
      const unsortedYaml = `
interceptFrom:
  steps:
    - log:
        message: Intercepted from source
        id: log-from
  uri: "direct:*"
  description: Intercept from direct endpoints
  id: interceptFrom-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelInterceptFromVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('interceptFrom-sorted');
    });
  });

  describe('CamelInterceptSendToEndpointVisualEntity', () => {
    it('should sort interceptSendToEndpoint properties', () => {
      const unsortedYaml = `
interceptSendToEndpoint:
  steps:
    - log:
        message: Intercepted send to endpoint
        id: log-send
  skipSendToOriginalEndpoint: true
  uri: "mock:*"
  description: Intercept sends to mock endpoints
  id: interceptSend-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelInterceptSendToEndpointVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('interceptSendToEndpoint-sorted');
    });
  });

  describe('CamelOnCompletionVisualEntity', () => {
    it('should sort onCompletion properties', () => {
      const unsortedYaml = `
onCompletion:
  steps:
    - log:
        message: Route completed
        id: log-complete
  onFailureOnly: false
  onCompleteOnly: true
  description: On completion handler
  id: onCompletion-1234
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelOnCompletionVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('onCompletion-sorted');
    });

    it('should sort onCompletion with parallel processing', () => {
      const unsortedYaml = `
onCompletion:
  steps:
    - to:
        uri: direct:cleanup
  parallelProcessing: true
  executorService: myExecutor
  mode: AfterConsumer
  id: onCompletion-parallel
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelOnCompletionVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('onCompletion-with-parallel-sorted');
    });
  });

  describe('CamelErrorHandlerVisualEntity', () => {
    it('should sort errorHandler with deadLetterChannel', () => {
      const unsortedYaml = `
errorHandler:
  deadLetterChannel:
    deadLetterUri: direct:dlq
    redeliveryPolicy:
      maximumRedeliveries: 5
      redeliveryDelay: 2000
      backOffMultiplier: 2
    id: dlc-1
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelErrorHandlerVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('errorHandler-deadLetterChannel-sorted');
    });

    it('should sort errorHandler with defaultErrorHandler', () => {
      const unsortedYaml = `
errorHandler:
  defaultErrorHandler:
    redeliveryPolicy:
      maximumRedeliveries: 3
      logStackTrace: true
    id: default-eh
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelErrorHandlerVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('errorHandler-defaultErrorHandler-sorted');
    });
  });

  describe('KameletVisualEntity', () => {
    it('should sort kamelet template from properties', () => {
      const unsortedYaml = `
apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: test-source
spec:
  template:
    from:
      steps:
        - to:
            uri: kamelet:sink
      parameters:
        period: "{{period}}"
        timerName: test
      uri: timer:tick
  definition:
    title: Test Source
    properties:
      period:
        title: Period
        type: integer
        default: 1000
`;
      const parsed = parse(unsortedYaml);
      const entity = new KameletVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('kamelet-template-sorted');
    });

    it('should sort kamelet with multiple steps', () => {
      const unsortedYaml = `
apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: transform-action
spec:
  template:
    from:
      steps:
        - setHeader:
            simple: "\${body.id}"
            name: itemId
        - marshal:
            json: {}
        - to:
            uri: kamelet:sink
      uri: kamelet:source
`;
      const parsed = parse(unsortedYaml);
      const entity = new KameletVisualEntity(parsed);
      const result = entity.toJSON();

      expect(stringify(result, { schema: 'yaml-1.1' })).toMatchSnapshot('kamelet-with-steps-sorted');
    });
  });

  describe('YAML output verification', () => {
    it('should produce valid YAML after sorting', () => {
      const unsortedYaml = `
route:
  from:
    steps:
      - to:
          parameters:
            message: Hello World
          uri: log:info
    parameters:
      period: 1000
      timerName: test
    uri: timer:tick
  description: Test route
  id: yaml-test-route
`;
      const parsed = parse(unsortedYaml);
      const entity = new CamelRouteVisualEntity(parsed);
      const result = entity.toJSON();

      // Convert to YAML and verify it's valid
      const yamlOutput = stringify(result, { schema: 'yaml-1.1' });
      expect(typeof yamlOutput).toBe('string');
      expect(yamlOutput.length).toBeGreaterThan(0);

      expect(yamlOutput).toMatchSnapshot('yaml-output-sorted');
    });
  });
});
