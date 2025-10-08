import { SerializerType } from './camel-resource';
import { CamelResourceFactory } from './camel-resource-factory';
import { CamelRouteResource } from './camel-route-resource';

describe('CamelResourceFactory', () => {
  describe('createCamelResource', () => {
    it('should use XML serializer for XML content', () => {
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><routes></routes>';
      const resource = CamelResourceFactory.createCamelResource(xmlContent);
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.XML);
    });

    it('should use YAML serializer for YAML content', () => {
      const yamlContent = '- from:\n    uri: timer:foo';
      const resource = CamelResourceFactory.createCamelResource(yamlContent);
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.YAML);
    });

    it('should use XML serializer when path ends with .xml', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'route.xml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.XML);
    });

    it('should use YAML serializer when path ends with .yaml', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'route.yaml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.YAML);
    });

    it('should use XML serializer with path with XML and YAML content', () => {
      const yamlContent = '- from:\n    uri: timer:foo';
      const resource = CamelResourceFactory.createCamelResource(yamlContent, { path: 'route.xml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.XML);
    });

    it('should use YAML serializer with path with YAML and XML content', () => {
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><routes></routes>';
      const resource = CamelResourceFactory.createCamelResource(xmlContent, { path: 'route.yaml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.YAML);
    });

    it('should handle undefined source and path', () => {
      const resource = CamelResourceFactory.createCamelResource();
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.YAML);
    });

    it('should handle empty options object', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, {});
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource.getSerializerType()).toEqual(SerializerType.YAML);
    });
  });
});
