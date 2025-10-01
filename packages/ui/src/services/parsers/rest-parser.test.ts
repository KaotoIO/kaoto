import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { mockRandomValues } from '../../stubs';
import { restStub } from '../../stubs/rest';
import { restConfigurationStub } from '../../stubs/rest-configuration';
import { restOperationsYaml } from '../../stubs/rest-operations';
import { RestParser } from './rest-parser';

describe('RestParser', () => {
  beforeAll(() => {
    mockRandomValues();
  });

  describe('parseRestEntity()', () => {
    it('should parse rest', () => {
      const restEntity = CamelResourceFactory.createCamelResource(
        restOperationsYaml,
      ).getVisualEntities()[0] as CamelRestVisualEntity;
      const parsed = RestParser.parseRestEntity(restEntity);

      expect(parsed.title).toEqual('rest-1234 [Path : /api/v3]');
      expect(parsed.description).toBeUndefined();
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(4);
      expect(parsed.headers[0]).toEqual('Method');
      expect(parsed.headers[1]).toEqual('ID');
      expect(parsed.headers[2]).toEqual('Path');
      expect(parsed.headers[3]).toEqual('Route');
      expect(parsed.data.length).toEqual(20);
      expect(parsed.data[0][0]).toEqual('GET');
      expect(parsed.data[0][1]).toEqual('findPetsByStatus');
      expect(parsed.data[0][2]).toEqual('/pet/findByStatus');
      expect(parsed.data[0][3]).toEqual('direct:findPetsByStatus');
    });

    it('should parse rest with openapi spec', () => {
      const restEntity = new CamelRestVisualEntity(restStub);
      const parsed = RestParser.parseRestEntity(restEntity);

      expect(parsed.headers.length).toEqual(1);
      expect(parsed.headers[0]).toEqual('Open API Specification');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('https://api.example.com/openapi.json');
    });
  });

  describe('parseRestConfigurationEntity()', () => {
    it('should parse rest configuration', () => {
      const rcEntity = new CamelRestConfigurationVisualEntity(restConfigurationStub);
      const parsed = RestParser.parseRestConfigurationEntity(rcEntity);

      expect(parsed.title).toEqual('restConfiguration-1234');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(2);
      expect(parsed.headers[0]).toEqual('Parameter Name');
      expect(parsed.headers[1]).toEqual('Parameter Value');
      expect(parsed.data.length).toEqual(6);
      expect(parsed.data[0][0]).toEqual('apiComponent');
      expect(parsed.data[0][1]).toEqual('openapi');
    });
  });
});
