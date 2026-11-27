import { JSONSchema7 } from 'json-schema';

import { DocumentDefinition, DocumentDefinitionType, DocumentType, Types } from '../../../models/datamapper';
import { DocumentUtilService } from '../document-util.service';
import {
  JsonSchemaCollection,
  JsonSchemaDocument,
  JsonSchemaField,
  JsonSchemaMetadata,
} from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';

function createJsonDocument(schema: JSONSchema7): JsonSchemaDocument {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body', {
    'main.json': JSON.stringify(schema),
  });
  const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
  if (!result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
  }
  return result.document;
}

function expandProperty(parent: { fields: JsonSchemaField[] }, key: string): JsonSchemaField {
  const field = parent.fields.find((f) => f.key === key);
  if (!field) throw new Error(`Property ${key} not found`);
  DocumentUtilService.resolveTypeFragment(field);
  return field;
}

describe('JsonSchemaCollection', () => {
  describe('addAlias', () => {
    it('should return false and register no alias when the identifier is unknown', () => {
      const collection = new JsonSchemaCollection();

      const added = collection.addAlias('unknown.json', './unknown.json');

      expect(added).toBe(false);
      expect(collection.getJsonSchema('./unknown.json')).toBeUndefined();
    });
  });

  describe('resolveReference', () => {
    const mockCurrentSchema = { identifier: 'main.json', filePath: 'schemas/main.json', path: '#' };

    it.each([
      ['#/definitions/Type', 'internal reference (starts with #)'],
      ['#', 'empty schema part'],
    ])('should return undefined for %s', (ref) => {
      const collection = new JsonSchemaCollection();

      const result = collection.resolveReference(ref, mockCurrentSchema);

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

      it('should resolve a ./ reference from a schema in the root folder', () => {
        const collection = new JsonSchemaCollection();
        collection.setDefinitionFiles({
          'main.json': '{"$id": "main", "type": "object"}',
          'common.json': '{"$id": "common", "type": "object"}',
          'other/common.json': '{"$id": "other-common", "type": "object"}',
        });
        const currentSchema = { identifier: 'main', filePath: 'main.json', path: '#' };

        const result = collection.resolveReference('./common.json#/definitions/Type', currentSchema);

        expect(result?.identifier).toBe('common');
      });

      it('should keep a leading ../ when the reference climbs above the folder of the current schema', () => {
        const collection = new JsonSchemaCollection();
        collection.setDefinitionFiles({
          'schemas/main.json': '{"$id": "main", "type": "object"}',
          '../common.json': '{"$id": "outside", "type": "object"}',
          'schemas/types/common.json': '{"$id": "inside", "type": "object"}',
        });
        const currentSchema = { identifier: 'main', filePath: 'schemas/main.json', path: '#' };

        const result = collection.resolveReference('../../common.json#/definitions/Type', currentSchema);

        expect(result?.identifier).toBe('outside');
        expect(result?.filePath).toBe('../common.json');
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

describe('JsonSchemaField', () => {
  describe('adopting the properties of a referenced definition', () => {
    it('should copy the nested properties of the definition', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: {
          Location: {
            type: 'object',
            properties: { position: { type: 'object', properties: { latitude: { type: 'number' } } } },
          },
        },
        properties: { location: { $ref: '#/definitions/Location' } },
      });

      const location = expandProperty(document.fields[0], 'location');

      const position = location.fields.find((f) => f.key === 'position');
      expect(position?.parent).toBe(location);
      expect(position?.fields.map((f) => [f.key, f.type])).toEqual([['latitude', Types.Numeric]]);
      expect(position?.fields[0].parent).toBe(position);
    });

    it('should mark a property as required when the referencing schema requires it', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: {
          Address: { type: 'object', properties: { street: { type: 'string' }, zip: { type: 'string' } } },
        },
        properties: {
          address: { type: 'object', required: ['street'], allOf: [{ $ref: '#/definitions/Address' }] },
        },
      });

      const address = expandProperty(document.fields[0], 'address');

      expect(address.fields.map((f) => [f.key, f.minOccurs])).toEqual([
        ['street', 1],
        ['zip', 0],
      ]);
    });

    it('should let the items of an array definition repeat', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: { Tags: { type: 'array', items: { type: 'string' } } },
        properties: { tags: { $ref: '#/definitions/Tags' } },
      });

      const tags = expandProperty(document.fields[0], 'tags');

      expect(tags.fields).toHaveLength(1);
      expect(tags.fields[0].maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should replace an untyped property with the typed property of the definition', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: { Named: { type: 'object', properties: { name: { type: 'string' } } } },
        properties: {
          person: { type: 'object', properties: { name: {} }, allOf: [{ $ref: '#/definitions/Named' }] },
        },
      });

      const person = expandProperty(document.fields[0], 'person');

      expect(person.fields.map((f) => [f.key, f.type])).toEqual([['name', Types.String]]);
    });

    it('should keep the description of a property when the definition has none', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: { Named: { type: 'object', properties: { name: { type: 'string' } } } },
        properties: {
          person: {
            type: 'object',
            properties: { name: { type: 'string', description: 'Full name' } },
            allOf: [{ $ref: '#/definitions/Named' }],
          },
        },
      });

      const person = expandProperty(document.fields[0], 'person');

      expect(person.fields).toHaveLength(1);
      expect(person.fields[0].description).toBe('Full name');
    });

    it('should add the definition reference of a property merged from a second definition', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: {
          Address: { type: 'object', properties: { street: { type: 'string' } } },
          WithHome: {
            type: 'object',
            properties: { home: { type: 'object', properties: { floor: { type: 'integer' } } } },
          },
          WithHomeAddress: { type: 'object', properties: { home: { $ref: '#/definitions/Address' } } },
        },
        properties: {
          person: { allOf: [{ $ref: '#/definitions/WithHome' }, { $ref: '#/definitions/WithHomeAddress' }] },
        },
      });

      const person = expandProperty(document.fields[0], 'person');
      const home = expandProperty(person, 'home');

      expect(home.fields.map((f) => f.key)).toEqual(['floor', 'street']);
    });

    it('should not add a definition reference twice when two definitions share it', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: {
          Address: { type: 'object', properties: { street: { type: 'string' } } },
          Home: { type: 'object', properties: { home: { $ref: '#/definitions/Address' } } },
          OtherHome: { type: 'object', properties: { home: { $ref: '#/definitions/Address' } } },
        },
        properties: {
          person: { allOf: [{ $ref: '#/definitions/Home' }, { $ref: '#/definitions/OtherHome' }] },
        },
      });

      const person = expandProperty(document.fields[0], 'person');

      expect(person.fields[0].namedTypeFragmentRefs).toEqual(['#/definitions/Address']);
    });

    it('should not add a reference merged into one use of a definition to another use of it', () => {
      const document = createJsonDocument({
        type: 'object',
        definitions: {
          Address: { type: 'object', properties: { street: { type: 'string' } } },
          WithHome: {
            type: 'object',
            properties: { home: { type: 'object', properties: { floor: { type: 'integer' } } } },
          },
          WithHomeAddress: { type: 'object', properties: { home: { $ref: '#/definitions/Address' } } },
        },
        properties: {
          person: { allOf: [{ $ref: '#/definitions/WithHome' }, { $ref: '#/definitions/WithHomeAddress' }] },
          other: { $ref: '#/definitions/WithHome' },
        },
      });
      expandProperty(expandProperty(document.fields[0], 'person'), 'home');

      const other = expandProperty(document.fields[0], 'other');
      const otherHome = expandProperty(other, 'home');

      expect(otherHome.fields.map((f) => f.key)).toEqual(['floor']);
    });
  });
});
