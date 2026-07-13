import { CustomModeResource } from '../custom-mode/custom-mode-resource';
import { CamelResourceFactory } from './camel-resource-factory';
import { CamelRouteResource } from './camel-route-resource';
import { CamelXMLRouteResource } from './camel-xml-route-resource';

describe('CamelResourceFactory', () => {
  describe('createCamelResource', () => {
    it('should use XML serializer for XML content', () => {
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><routes></routes>';
      const resource = CamelResourceFactory.createCamelResource(xmlContent);
      expect(resource).toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should use YAML serializer for YAML content', () => {
      const yamlContent = '- from:\n    uri: timer:foo';
      const resource = CamelResourceFactory.createCamelResource(yamlContent);
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should use XML serializer when path ends with .xml', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'route.xml' });
      expect(resource).toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should use YAML serializer when path ends with .yaml', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'route.yaml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should use XML serializer with path with XML and YAML content', () => {
      const yamlContent = '- from:\n    uri: timer:foo';
      const resource = CamelResourceFactory.createCamelResource(yamlContent, { path: 'route.xml' });
      expect(resource).toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should use YAML serializer with path with YAML and XML content', () => {
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?><routes></routes>';
      const resource = CamelResourceFactory.createCamelResource(xmlContent, { path: 'route.yaml' });
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should handle undefined source and path', () => {
      const resource = CamelResourceFactory.createCamelResource();
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });

    it('should handle empty options object', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, {});
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });

    it('builds a CamelXMLRouteResource for XML source (no path)', () => {
      const resource = CamelResourceFactory.createCamelResource('<camel><routes/></camel>');
      expect(resource).toBeInstanceOf(CamelXMLRouteResource);
    });

    it('builds a CamelXMLRouteResource for a .xml path', () => {
      const resource = CamelResourceFactory.createCamelResource('<camel/>', { path: 'my.camel.xml' });
      expect(resource).toBeInstanceOf(CamelXMLRouteResource);
    });

    it('builds a plain CamelRouteResource for YAML source', () => {
      const resource = CamelResourceFactory.createCamelResource('- from:\n    uri: direct:start\n    steps: []\n');
      expect(resource).toBeInstanceOf(CamelRouteResource);
      expect(resource).not.toBeInstanceOf(CamelXMLRouteResource);
    });
    it('returns CustomModeResource for custom_modes.yaml path', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: 'custom_modes.yaml' });
      expect(resource).toBeInstanceOf(CustomModeResource);
    });

    it('returns CustomModeResource for path-prefixed custom_modes.yaml', () => {
      const resource = CamelResourceFactory.createCamelResource(undefined, { path: '/configs/custom_modes.yaml' });
      expect(resource).toBeInstanceOf(CustomModeResource);
    });

    it('returns CustomModeResource for yaml with customModes array (no path)', () => {
      const yaml =
        'customModes:\n  - slug: plan\n    name: Plan\n    description: ""\n    roleDefinition: ""\n    whenToUse: ""\n    groups: []\n';
      const resource = CamelResourceFactory.createCamelResource(yaml);
      expect(resource).toBeInstanceOf(CustomModeResource);
    });
  });
});
