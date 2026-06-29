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
    it('should parse rest', async () => {
      const camelResource = CamelResourceFactory.createCamelResource(restOperationsYaml);
      await camelResource.initialize();
      const restEntity = camelResource
        .getEntities()
        .find((e) => e instanceof CamelRestVisualEntity) as CamelRestVisualEntity;
      const parsed = RestParser.parseRestEntity(restEntity);

      expect(parsed.title).toBe('rest-1234 [Path : /api/v3]');
      expect(parsed.description).toBeUndefined();
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(4);
      expect(parsed.headers[0]).toBe('Method');
      expect(parsed.headers[1]).toBe('ID');
      expect(parsed.headers[2]).toBe('Path');
      expect(parsed.headers[3]).toBe('Route');
      expect(parsed.data).toHaveLength(20);
      expect(parsed.data[0][0]).toBe('GET');
      expect(parsed.data[0][1]).toBe('findPetsByStatus');
      expect(parsed.data[0][2]).toBe('/pet/findByStatus');
      expect(parsed.data[0][3]).toBe('direct:findPetsByStatus');
    });

    it('should parse rest with openapi spec', () => {
      const restEntity = new CamelRestVisualEntity(restStub);
      const parsed = RestParser.parseRestEntity(restEntity);

      expect(parsed.headers).toHaveLength(1);
      expect(parsed.headers[0]).toBe('Open API Specification');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('https://api.example.com/openapi.json');
    });
  });

  describe('parseRestConfigurationEntity()', () => {
    it('should parse rest configuration', () => {
      const rcEntity = new CamelRestConfigurationVisualEntity(restConfigurationStub);
      const parsed = RestParser.parseRestConfigurationEntity(rcEntity);

      expect(parsed.title).toBe('restConfiguration-1234');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(2);
      expect(parsed.headers[0]).toBe('Parameter Name');
      expect(parsed.headers[1]).toBe('Parameter Value');
      expect(parsed.data).toHaveLength(6);
      expect(parsed.data[0][0]).toBe('apiComponent');
      expect(parsed.data[0][1]).toBe('openapi');
    });
  });
});
