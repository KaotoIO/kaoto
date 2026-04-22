import { JsonSchemaCollection, JsonSchemaMetadata } from './json-schema-document.model';

describe('JsonSchemaCollection', () => {
  describe('resolveReference', () => {
    const mockCurrentSchema = { identifier: 'main.json', filePath: 'schemas/main.json', path: '#' };

    it('should return undefined for internal reference (starts with #)', () => {
      const collection = new JsonSchemaCollection();

      const result = collection.resolveReference('#/definitions/Type', mockCurrentSchema);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty schema part', () => {
      const collection = new JsonSchemaCollection();

      const result = collection.resolveReference('#', mockCurrentSchema);

      expect(result).toBeUndefined();
    });

    it('should return already loaded schema', () => {
      const collection = new JsonSchemaCollection();
      const existingSchema: JsonSchemaMetadata = {
        identifier: 'types.json',
        filePath: 'types.json',
        path: '#',
        type: 'object',
      };
      collection.addJsonSchema(existingSchema);

      const result = collection.resolveReference('types.json#/definitions/Address', mockCurrentSchema);

      expect(result).toBe(existingSchema);
    });

    it('should return undefined when no definition files available', () => {
      const collection = new JsonSchemaCollection();

      const result = collection.resolveReference('./types.json#/definitions/Address', mockCurrentSchema);

      expect(result).toBeUndefined();
    });

    describe('with definition files', () => {
      it('should resolve exact filename match', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'main.json': '{"$id": "main", "type": "object"}',
          'common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);

        const result = collection.resolveReference('common.json#/definitions/Type', mockCurrentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
        expect(result!.filePath).toBe('common.json');
      });

      it('should resolve relative path with ./ prefix', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          'schemas/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('./common.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
        expect(result!.filePath).toBe('schemas/common.json');
      });

      it('should resolve relative path without ./ prefix', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          'schemas/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('common.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
      });

      it('should normalize ./ in schemaLocation', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/types/base.json': '{"$id": "base", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('./types/./base.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('base');
      });

      it('should resolve ../ in schemaLocation', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          'common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('../common.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
        expect(result!.filePath).toBe('common.json');
      });

      it('should resolve nested relative paths (../../common.json)', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/types/nested/specific.json': '{"$id": "specific", "type": "object"}',
          'schemas/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'specific', filePath: 'schemas/types/nested/specific.json', path: '#' };

        const result = collection.resolveReference('../../common.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
        expect(result!.filePath).toBe('schemas/common.json');
      });

      it('should fallback to filename-only match when unique', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          'schemas/types/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);

        const result = collection.resolveReference('common.json#/definitions/Type', mockCurrentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
      });

      it('should throw error when filename match is ambiguous', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/common.json': '{"$id": "common1", "type": "object"}',
          'types/common.json': '{"$id": "common2", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'other', filePath: 'other.json', path: '#' };

        expect(() => {
          collection.resolveReference('common.json#/definitions/Type', currentSchema);
        }).toThrow('Ambiguous filename match for "common.json"');
      });

      it('should return undefined when schema not found', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'main.json': '{"$id": "main", "type": "object"}',
          'common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);

        const result = collection.resolveReference('missing.json#/definitions/Type', mockCurrentSchema);

        expect(result).toBeUndefined();
      });

      it('should handle absolute paths', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          '/schemas/main.json': '{"$id": "main", "type": "object"}',
          '/schemas/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);

        const result = collection.resolveReference('/schemas/common.json#/definitions/Type', mockCurrentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
      });

      it('should resolve with absolute schemaLocation ignoring baseUri', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          '/absolute/common.json': '{"$id": "common", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('/absolute/common.json#/definitions/Type', currentSchema);

        expect(result).toBeDefined();
        expect(result!.identifier).toBe('common');
      });

      it('should register aliases for loaded schemas', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'schemas/types.json': '{"$id": "http://example.com/types", "type": "object"}',
        };
        collection.setDefinitionFiles(definitionFiles);

        const result = collection.resolveReference('schemas/types.json#/definitions/Type', mockCurrentSchema);

        expect(result).toBeDefined();
        expect(collection.getJsonSchema('http://example.com/types')).toBe(result);
        expect(collection.getJsonSchema('./schemas/types.json')).toBe(result);
      });

      it('should throw error on parse failure', () => {
        const collection = new JsonSchemaCollection();
        const definitionFiles = {
          'invalid.json': 'not valid json',
        };
        collection.setDefinitionFiles(definitionFiles);

        expect(() => {
          collection.resolveReference('invalid.json#/definitions/Type', mockCurrentSchema);
        }).toThrow('Failed to load schema from "invalid.json"');
      });
    });

    describe('addDefinitionFiles', () => {
      it('should add files to empty collection', () => {
        const collection = new JsonSchemaCollection();

        collection.addDefinitionFiles({ 'new.json': '{"$id": "new", "type": "object"}' });

        const result = collection.resolveReference('new.json#/definitions/Type', mockCurrentSchema);
        expect(result).toBeDefined();
        expect(result!.identifier).toBe('new');
      });

      it('should add files to existing definition files', () => {
        const collection = new JsonSchemaCollection();
        collection.setDefinitionFiles({ 'old.json': '{"$id": "old", "type": "object"}' });

        collection.addDefinitionFiles({ 'new.json': '{"$id": "new", "type": "object"}' });

        const oldResult = collection.resolveReference('old.json#/definitions/Type', mockCurrentSchema);
        expect(oldResult).not.toBeNull();
        const newResult = collection.resolveReference('new.json#/definitions/Type', mockCurrentSchema);
        expect(newResult).not.toBeNull();
      });
    });
  });
});
