import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCitrusCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CitrusTestResource } from '../../../citrus/citrus-test-resource';
import { Test } from '../../../citrus/entities/Test.d';
import { CamelCatalogService } from '../../flows';
import { EndpointsEntityHandler } from './endpoints-entity-handler';

describe('EndpointsEntityHandler', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, catalogsMap.endpointsCatalogMap);
  });

  describe('with valid CitrusTestResource', () => {
    let testResource: CitrusTestResource;
    let endpointsHandler: EndpointsEntityHandler;
    let testModel: Test;

    beforeEach(() => {
      testModel = {
        name: 'test',
        actions: [],
      };
      testResource = new CitrusTestResource(testModel);
      endpointsHandler = new EndpointsEntityHandler(testResource);
    });

    it('should get endpoints schema', () => {
      const schema = endpointsHandler.getEndpointsSchema();
      expect(schema).toBeDefined();
      expect(schema!.oneOf).toBeDefined();
      expect(Array.isArray(schema!.oneOf)).toBeTruthy();
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
      expect(definedEndpoints.length).toBe(2);
      expect(definedEndpoints[0]).toEqual({ name: 'httpClient', type: 'http.client' });
      expect(definedEndpoints[1]).toEqual({ name: 'jmsQueue', type: 'jms.asynchronous' });
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
      expect(allEndpoints.length).toBe(2);
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
      expect(definedEndpoints[0]).toEqual({ name: 'explicitEndpoint', type: 'custom.type' });
    });

    it('should handle endpoints with empty type', () => {
      testModel.endpoints = [
        {
          name: 'emptyTypeEndpoint',
          type: '',
        },
      ];

      const definedEndpoints = endpointsHandler.getDefinedEndpointsNameAndType();
      expect(definedEndpoints[0]).toEqual({ name: 'emptyTypeEndpoint', type: '' });
    });
  });

  describe('without CitrusTestResource', () => {
    it('should get endpoints schema even without resource', () => {
      const endpointsHandler = new EndpointsEntityHandler(undefined);

      const schema = endpointsHandler.getEndpointsSchema();
      expect(schema).toBeDefined();
      expect(schema!.oneOf).toBeDefined();
    });
  });
});
