import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { getFirstCitrusCatalogMap, setupCitrusDynamicCatalogRegistry } from '../../../../stubs/test-load-catalog';
import { CitrusTestResource } from '../../../citrus/citrus-test-resource';
import { Test, TestActions } from '../../../citrus/entities/Test.d';
import { EndpointsEntityHandler } from './endpoints-entity-handler';

describe('EndpointsEntityHandler', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    setupCitrusDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  describe('with valid CitrusTestResource', () => {
    let testResource: CitrusTestResource;
    let endpointsHandler: EndpointsEntityHandler;
    let testModel: Test;

    beforeEach(async () => {
      testModel = {
        name: 'test',
        actions: [],
      };
      testResource = new CitrusTestResource(testModel);
      await testResource.initialize();
      endpointsHandler = new EndpointsEntityHandler(testResource);
    });

    it('should return empty array when no endpoints are defined', () => {
      const nameAndType = endpointsHandler.getAllEndpointsNameAndType();
      expect(nameAndType).toEqual([]);
    });

    it('should get defined endpoints name and type', () => {
      testModel.endpoints = [
        {
          http: {
            client: {
              name: 'httpClient',
              requestUrl: 'http://localhost:8080',
            },
          },
        },
        {
          jms: {
            asynchronous: {
              name: 'jmsQueue',
              connectionFactory: 'jmsConnectionFactory',
              destination: 'test.queue',
            },
          },
        },
      ];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();
      expect(definedEndpoints).toHaveLength(2);
      expect(definedEndpoints[0]).toEqual({ name: 'httpClient', type: 'http.client', index: 0 });
      expect(definedEndpoints[1]).toEqual({ name: 'jmsQueue', type: 'jms.asynchronous', index: 1 });
    });

    it('should keep the index of each defined endpoint in the list of all endpoints', () => {
      testModel.endpoints = [{ name: 'withoutType' }, { http: { client: { name: 'httpClient' } } }];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();

      expect(definedEndpoints).toEqual([{ name: 'httpClient', type: 'http.client', index: 1 }]);
    });

    it('should get all endpoints including createEndpoint actions', () => {
      testModel.endpoints = [
        {
          http: {
            client: {
              name: 'httpClient',
              requestUrl: 'http://localhost:8080',
            },
          },
        },
      ];

      testModel.actions = [
        {
          createEndpoint: {
            type: 'jms',
            name: 'jmsQueue',
            properties: {
              destination: 'dynamic.queue',
            },
          },
        },
      ];

      const allEndpoints = endpointsHandler.getAllEndpointsNameAndType();
      expect(allEndpoints).toHaveLength(2);
      expect(allEndpoints[0]).toEqual({ name: 'httpClient', type: 'http.client' });
      expect(allEndpoints[1]).toEqual({ name: 'jmsQueue', type: 'jms' });
    });

    it('should detect endpoint type correctly', () => {
      const endpoint = {
        http: {
          client: {
            name: 'httpClient',
            requestUrl: 'http://localhost:8080',
          },
        },
      };

      const type = endpointsHandler.getEndpointType(endpoint);
      expect(type).toBe('http.client');
    });

    it('should detect simple endpoint type', () => {
      const endpoint = {
        direct: {
          name: 'directEndpoint',
        },
      };

      const type = endpointsHandler.getEndpointType(endpoint);
      expect(type).toBe('direct');
    });

    it('should return empty string for invalid endpoint', () => {
      const type = endpointsHandler.getEndpointType({});
      expect(type).toBe('');
    });

    it('should find endpoint name from path', () => {
      const endpoint = {
        http: {
          client: {
            name: 'myHttpClient',
            requestUrl: 'http://localhost:8080',
          },
        },
      };

      const name = endpointsHandler.findEndpointName('http.client', endpoint);
      expect(name).toBe('myHttpClient');
    });

    it('should find endpoint name from root when path name not found', () => {
      const endpoint = {
        name: 'rootName',
        http: {
          client: {
            requestUrl: 'http://localhost:8080',
          },
        },
      };

      const name = endpointsHandler.findEndpointName('http.client', endpoint);
      expect(name).toBe('rootName');
    });

    it('should return empty string when name not found', () => {
      const endpoint = {
        http: {
          client: {
            requestUrl: 'http://localhost:8080',
          },
        },
      };

      const name = endpointsHandler.findEndpointName('http.client', endpoint);
      expect(name).toBe('');
    });

    it('should add new endpoint', () => {
      endpointsHandler.addNewEndpoint('http-client', {
        name: 'newHttpClient',
        requestUrl: 'http://localhost:9090',
      });

      const testEntity = endpointsHandler.getTestEntity();
      expect(testEntity?.endpoints).toBeDefined();
      expect(testEntity?.endpoints?.length).toBe(1);
      expect(testEntity?.endpoints![0]).toEqual({
        http: {
          client: {
            name: 'newHttpClient',
            requestUrl: 'http://localhost:9090',
          },
        },
      });
    });

    it('should add multiple endpoints', () => {
      endpointsHandler.addNewEndpoint('http-client', {
        name: 'httpClient1',
        requestUrl: 'http://localhost:8080',
      });

      endpointsHandler.addNewEndpoint('jms-queue', {
        name: 'jmsQueue1',
        destination: 'test.queue',
      });

      const testEntity = endpointsHandler.getTestEntity();
      expect(testEntity?.endpoints?.length).toBe(2);
    });

    it('should update existing endpoint', () => {
      testModel.endpoints = [
        {
          http: {
            client: {
              name: 'httpClient',
              requestUrl: 'http://localhost:8080',
            },
          },
        },
      ];

      endpointsHandler.updateEndpoint(
        'http-client',
        {
          name: 'httpClient',
          requestUrl: 'http://localhost:9090',
        },
        'httpClient',
      );

      const testEntity = endpointsHandler.getTestEntity();
      expect(testEntity?.endpoints![0]).toEqual({
        http: {
          client: {
            name: 'httpClient',
            requestUrl: 'http://localhost:9090',
          },
        },
      });
    });

    it('should update endpoint with new name', () => {
      testModel.endpoints = [
        {
          http: {
            client: {
              name: 'oldName',
              requestUrl: 'http://localhost:8080',
            },
          },
        },
      ];

      endpointsHandler.updateEndpoint(
        'http-client',
        {
          name: 'newName',
          requestUrl: 'http://localhost:8080',
        },
        'oldName',
      );

      const endpoints = endpointsHandler.getDefinedEndpointsNameAndType();
      expect(endpoints[0].name).toBe('newName');
    });

    it('should add endpoint if update target not found', () => {
      endpointsHandler.updateEndpoint(
        'http-client',
        {
          name: 'httpClient',
          requestUrl: 'http://localhost:8080',
        },
        'nonExistent',
      );

      const testEntity = endpointsHandler.getTestEntity();
      expect(testEntity?.endpoints).toBeDefined();
      expect(testEntity?.endpoints?.length).toBe(1);
    });

    it('should handle endpoints with explicit type property', () => {
      testModel.endpoints = [
        {
          name: 'explicitEndpoint',
          type: 'custom.type',
        },
      ];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();
      expect(definedEndpoints[0]).toEqual({ name: 'explicitEndpoint', type: 'custom.type', index: 0 });
    });

    it('should handle endpoints with empty type', () => {
      testModel.endpoints = [
        {
          name: 'emptyTypeEndpoint',
          type: '',
        },
      ];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();
      expect(definedEndpoints[0]).toEqual({ name: 'emptyTypeEndpoint', type: '', index: 0 });
    });

    it('should list a typed endpoint without a name with an empty name', () => {
      testModel.endpoints = [{ type: 'http' }];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();

      expect(definedEndpoints).toEqual([{ name: '', type: 'http', index: 0 }]);
    });

    it('should take the name from the endpoint root when it precedes the endpoint type', () => {
      testModel.endpoints = [{ name: 'rootName', http: { client: { requestUrl: 'http://localhost:8080' } } }];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();

      expect(definedEndpoints).toEqual([{ name: 'rootName', type: 'http.client', index: 0 }]);
    });

    it.each([
      ['without a type', { name: 'incomplete' }],
      ['without a name', { http: { client: { requestUrl: 'http://localhost:8080' } } }],
    ])('should not list an endpoint %s', (_description, endpoint) => {
      testModel.endpoints = [endpoint];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();

      expect(definedEndpoints).toEqual([]);
    });

    it.each([
      ['an action other than createEndpoint', { print: { message: 'Hello' } }],
      ['a createEndpoint action without a type', { createEndpoint: { name: 'jmsQueue' } }],
      ['a createEndpoint action without a name', { createEndpoint: { type: 'jms' } }],
      ['an empty createEndpoint action', { createEndpoint: null }],
    ])('should not list an endpoint for %s', (_description, action) => {
      testModel.actions = [action as TestActions];

      const allEndpoints = endpointsHandler.getAllEndpointsNameAndType();

      expect(allEndpoints).toEqual([]);
    });

    it('should list the defined endpoints when the YAML actions key of the test is empty', () => {
      testModel.actions = parse('actions:').actions;
      testModel.endpoints = [{ http: { client: { name: 'httpClient' } } }];

      const allEndpoints = endpointsHandler.getAllEndpointsNameAndType();

      expect(allEndpoints).toEqual([{ name: 'httpClient', type: 'http.client' }]);
    });

    it('should get the endpoint at the given index', () => {
      const jmsEndpoint = { jms: { asynchronous: { name: 'jmsQueue' } } };
      testModel.endpoints = [{ http: { client: { name: 'httpClient' } } }, jmsEndpoint];

      const endpoint = endpointsHandler.getEndpoint(1);

      expect(endpoint).toBe(jmsEndpoint);
    });

    it('should delete the endpoint at the given index', () => {
      const httpEndpoint = { http: { client: { name: 'httpClient' } } };
      testModel.endpoints = [httpEndpoint, { jms: { asynchronous: { name: 'jmsQueue' } } }];

      endpointsHandler.deleteEndpoint(1);

      expect(testModel.endpoints).toEqual([httpEndpoint]);
    });

    it('should update the endpoint matching the model name when no previous name is given', () => {
      testModel.endpoints = [{ http: { client: { name: 'httpClient', requestUrl: 'http://localhost:8080' } } }];

      endpointsHandler.updateEndpoint(
        'http-client',
        { name: 'httpClient', requestUrl: 'http://localhost:9090' },
        undefined,
      );

      expect(testModel.endpoints).toEqual([
        { http: { client: { name: 'httpClient', requestUrl: 'http://localhost:9090' } } },
      ]);
    });

    it('should append the endpoint when no existing endpoint has the previous name', () => {
      const otherEndpoint = { http: { client: { name: 'otherClient' } } };
      testModel.endpoints = [otherEndpoint];

      endpointsHandler.updateEndpoint('http-client', { name: 'httpClient' }, 'httpClient');

      expect(testModel.endpoints).toEqual([otherEndpoint, { http: { client: { name: 'httpClient' } } }]);
    });

    it('should not update an endpoint without a type that carries the previous name', () => {
      const untypedEndpoint = { name: 'httpClient' };
      testModel.endpoints = [untypedEndpoint, { http: { client: { name: 'httpClient' } } }];

      endpointsHandler.updateEndpoint(
        'http-client',
        { name: 'httpClient', requestUrl: 'http://localhost:9090' },
        'httpClient',
      );

      expect(testModel.endpoints).toEqual([
        untypedEndpoint,
        { http: { client: { name: 'httpClient', requestUrl: 'http://localhost:9090' } } },
      ]);
    });
  });
});
