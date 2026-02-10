import { JSONSchema7 } from 'json-schema';

import {
  commonTypesJsonSchema,
  customerJsonSchema,
  mainWithRefJsonSchema,
  orderJsonSchema,
  productJsonSchema,
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaAnalysisService } from './json-schema-analysis.service';
import { JsonSchemaMetadata } from './json-schema-document.model';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';

function createMetadata(identifier: string, filePath: string, schema: JSONSchema7): JsonSchemaMetadata {
  return { ...schema, identifier, filePath, path: '#' };
}

function parseMetadata(filePath: string, content: string): JsonSchemaMetadata {
  return JsonSchemaDocumentUtilService.parseJsonSchema(content, filePath);
}

describe('JsonSchemaAnalysisService', () => {
  describe('extractRefs', () => {
    it('should return empty array for schema with no $ref', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual([]);
    });

    it('should extract top-level $ref', () => {
      const schema: JSONSchema7 = {
        $ref: '#/definitions/MyType',
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/MyType']);
    });

    it('should extract $ref from properties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          address: { $ref: './CommonTypes.json#/definitions/Address' },
          name: { type: 'string' },
        },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['./CommonTypes.json#/definitions/Address']);
    });

    it('should extract $ref from items', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { $ref: '#/definitions/Item' },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Item']);
    });

    it('should extract $ref from items array', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: [{ $ref: '#/definitions/First' }, { $ref: '#/definitions/Second' }],
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/First', '#/definitions/Second']);
    });

    it('should extract $ref from definitions', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        definitions: {
          SubType: { $ref: './Other.json#/definitions/Base' },
        },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['./Other.json#/definitions/Base']);
    });

    it('should extract $ref from allOf', () => {
      const schema: JSONSchema7 = {
        allOf: [{ $ref: '#/definitions/Base' }, { type: 'object', properties: { extra: { type: 'string' } } }],
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Base']);
    });

    it('should extract $ref from anyOf', () => {
      const schema: JSONSchema7 = {
        anyOf: [{ $ref: '#/definitions/TypeA' }, { $ref: '#/definitions/TypeB' }],
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/TypeA', '#/definitions/TypeB']);
    });

    it('should extract $ref from oneOf', () => {
      const schema: JSONSchema7 = {
        oneOf: [{ $ref: '#/definitions/Option1' }, { $ref: '#/definitions/Option2' }],
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Option1', '#/definitions/Option2']);
    });

    it('should extract $ref from not', () => {
      const schema: JSONSchema7 = {
        not: { $ref: '#/definitions/Excluded' },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Excluded']);
    });

    it('should extract $ref from additionalProperties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        additionalProperties: { $ref: '#/definitions/Extra' },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Extra']);
    });

    it('should not extract from boolean additionalProperties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        additionalProperties: true,
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual([]);
    });

    it('should extract $ref from patternProperties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        patternProperties: {
          '^S_': { $ref: '#/definitions/StringProp' },
        },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/StringProp']);
    });

    it('should extract $ref from if/then/else', () => {
      const schema: JSONSchema7 = {
        if: { $ref: '#/definitions/Condition' },
        then: { $ref: '#/definitions/ThenResult' },
        else: { $ref: '#/definitions/ElseResult' },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Condition', '#/definitions/ThenResult', '#/definitions/ElseResult']);
    });

    it('should extract $ref from contains', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        contains: { $ref: '#/definitions/Required' },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toEqual(['#/definitions/Required']);
    });

    it('should extract multiple nested $ref', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          address: { $ref: './CommonTypes.json#/definitions/Address' },
          contact: { $ref: './CommonTypes.json#/definitions/ContactInfo' },
        },
        definitions: {
          LocalType: {
            type: 'object',
            properties: {
              nested: { $ref: '#/definitions/OtherLocal' },
            },
          },
          OtherLocal: { type: 'string' },
        },
      };

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toHaveLength(3);
      expect(refs).toContain('./CommonTypes.json#/definitions/Address');
      expect(refs).toContain('./CommonTypes.json#/definitions/ContactInfo');
      expect(refs).toContain('#/definitions/OtherLocal');
    });

    it('should extract refs from real Order schema', () => {
      const schema = JSON.parse(orderJsonSchema) as JSONSchema7;

      const refs = JsonSchemaAnalysisService.extractRefs(schema);

      expect(refs).toContain('./Customer.schema.json');
      expect(refs).toContain('./CommonTypes.schema.json#/definitions/Money');
      expect(refs).toContain('http://example.com/schemas/common-types.json#/definitions/Money');
    });
  });

  describe('analyze', () => {
    describe('single schema', () => {
      it('should handle single schema with no refs', () => {
        const schema = createMetadata('simple', 'simple.json', {
          type: 'object',
          properties: { name: { type: 'string' } },
        });

        const result = JsonSchemaAnalysisService.analyze([schema]);

        expect(result.nodes.size).toBe(1);
        expect(result.edges).toHaveLength(0);
        expect(result.circularDependencies).toHaveLength(0);
        expect(result.missingReferences).toHaveLength(0);
        expect(result.loadOrder).toEqual(['simple']);
        expect(result.warnings).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should skip internal self-references', () => {
        const schema = createMetadata('self', 'self.json', {
          type: 'object',
          definitions: {
            Node: {
              type: 'object',
              properties: {
                child: { $ref: '#/definitions/Node' },
              },
            },
          },
          properties: {
            root: { $ref: '#/definitions/Node' },
          },
        });

        const result = JsonSchemaAnalysisService.analyze([schema]);

        expect(result.circularDependencies).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
        expect(result.missingReferences).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('two schemas', () => {
      it('should detect A depends on B', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: {
            b: { $ref: './B.json#/definitions/TypeB' },
          },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          definitions: {
            TypeB: { type: 'string' },
          },
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.edges).toHaveLength(1);
        expect(result.edges[0].from).toBe('A');
        expect(result.edges[0].to).toBe('B');

        const nodeA = result.nodes.get('A')!;
        expect(nodeA.outbound).toHaveLength(1);
        expect(nodeA.inbound).toHaveLength(0);

        const nodeB = result.nodes.get('B')!;
        expect(nodeB.outbound).toHaveLength(0);
        expect(nodeB.inbound).toHaveLength(1);
      });

      it('should produce loading order with dependency first', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: {
            b: { $ref: './B.json' },
          },
        });
        const schemaB = createMetadata('B', 'B.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.loadOrder).toEqual(['B', 'A']);
      });
    });

    describe('chain A -> B -> C', () => {
      it('should produce correct loading order', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: { b: { $ref: './B.json' } },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          properties: { c: { $ref: './C.json' } },
        });
        const schemaC = createMetadata('C', 'C.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB, schemaC]);

        expect(result.loadOrder).toEqual(['C', 'B', 'A']);
        expect(result.circularDependencies).toHaveLength(0);
      });
    });

    describe('diamond dependency', () => {
      it('should handle diamond A->B, A->C, B->D, C->D', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: {
            b: { $ref: './B.json' },
            c: { $ref: './C.json' },
          },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          properties: { d: { $ref: './D.json' } },
        });
        const schemaC = createMetadata('C', 'C.json', {
          type: 'object',
          properties: { d: { $ref: './D.json' } },
        });
        const schemaD = createMetadata('D', 'D.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB, schemaC, schemaD]);

        expect(result.circularDependencies).toHaveLength(0);
        expect(result.loadOrder[0]).toBe('D');
        expect(result.loadOrder[result.loadOrder.length - 1]).toBe('A');
        expect(result.loadOrder).toHaveLength(4);
      });
    });

    describe('circular dependencies', () => {
      it('should detect simple A -> B -> A cycle', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: { b: { $ref: './B.json' } },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          properties: { a: { $ref: './A.json' } },
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.circularDependencies).toHaveLength(1);
        expect(result.circularDependencies[0].chain).toContain('A');
        expect(result.circularDependencies[0].chain).toContain('B');
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('Circular dependency');
        expect(result.loadOrder).toHaveLength(2);
      });

      it('should detect three-node cycle A -> B -> C -> A', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: { b: { $ref: './B.json' } },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          properties: { c: { $ref: './C.json' } },
        });
        const schemaC = createMetadata('C', 'C.json', {
          type: 'object',
          properties: { a: { $ref: './A.json' } },
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB, schemaC]);

        expect(result.circularDependencies).toHaveLength(1);
        expect(result.circularDependencies[0].chain).toHaveLength(4);
        expect(result.loadOrder).toHaveLength(3);
      });

      it('should still produce complete loading order with circular dependencies', () => {
        const schemaA = createMetadata('A', 'A.json', {
          type: 'object',
          properties: { b: { $ref: './B.json' } },
        });
        const schemaB = createMetadata('B', 'B.json', {
          type: 'object',
          properties: { a: { $ref: './A.json' } },
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.loadOrder).toHaveLength(2);
        expect(result.loadOrder).toContain('A');
        expect(result.loadOrder).toContain('B');
      });
    });

    describe('missing references', () => {
      it('should detect missing schema reference', () => {
        const schema = createMetadata('main', 'main.json', {
          type: 'object',
          properties: {
            ext: { $ref: './Missing.json#/definitions/Type' },
          },
        });

        const result = JsonSchemaAnalysisService.analyze([schema]);

        expect(result.missingReferences).toHaveLength(1);
        expect(result.missingReferences[0].from).toBe('main');
        expect(result.missingReferences[0].ref).toBe('./Missing.json#/definitions/Type');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Missing schema reference');
      });

      it('should not report missing when ref exists in definitionFiles', () => {
        const schema = createMetadata('main', 'main.json', {
          type: 'object',
          properties: {
            ext: { $ref: './Extra.json#/definitions/Type' },
          },
        });
        const definitionFiles = {
          'Extra.json': '{"type": "object", "definitions": {"Type": {"type": "string"}}}',
        };

        const result = JsonSchemaAnalysisService.analyze([schema], definitionFiles);

        expect(result.missingReferences).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('real schemas', () => {
      it('should analyze Order -> Customer -> CommonTypes correctly', () => {
        const order = parseMetadata('Order.schema.json', orderJsonSchema);
        const customer = parseMetadata('Customer.schema.json', customerJsonSchema);
        const common = parseMetadata('CommonTypes.schema.json', commonTypesJsonSchema);

        const result = JsonSchemaAnalysisService.analyze([order, customer, common]);

        expect(result.circularDependencies).toHaveLength(0);
        expect(result.missingReferences).toHaveLength(0);
        expect(result.errors).toHaveLength(0);

        const orderNode = result.nodes.get(order.identifier)!;
        expect(orderNode.outbound.length).toBeGreaterThan(0);

        const commonNode = result.nodes.get(common.identifier)!;
        expect(commonNode.outbound).toHaveLength(0);
        expect(commonNode.inbound.length).toBeGreaterThan(0);

        const commonIdx = result.loadOrder.indexOf(common.identifier);
        const orderIdx = result.loadOrder.indexOf(order.identifier);
        expect(commonIdx).toBeLessThan(orderIdx);
      });

      it('should analyze MainWithRef -> CommonTypes correctly', () => {
        const main = parseMetadata('MainWithRef.schema.json', mainWithRefJsonSchema);
        const common = parseMetadata('CommonTypes.schema.json', commonTypesJsonSchema);

        const result = JsonSchemaAnalysisService.analyze([main, common]);

        expect(result.circularDependencies).toHaveLength(0);
        expect(result.missingReferences).toHaveLength(0);

        const mainNode = result.nodes.get(main.identifier)!;
        expect(mainNode.outbound.length).toBeGreaterThan(0);

        const commonIdx = result.loadOrder.indexOf(common.identifier);
        const mainIdx = result.loadOrder.indexOf(main.identifier);
        expect(commonIdx).toBeLessThan(mainIdx);
      });

      it('should analyze nested/Product -> CommonTypes with ../ path', () => {
        const product = parseMetadata('nested/Product.schema.json', productJsonSchema);
        const common = parseMetadata('CommonTypes.schema.json', commonTypesJsonSchema);

        const result = JsonSchemaAnalysisService.analyze([product, common]);

        expect(result.circularDependencies).toHaveLength(0);
        expect(result.missingReferences).toHaveLength(0);

        const productNode = result.nodes.get(product.identifier)!;
        expect(productNode.outbound.length).toBeGreaterThan(0);

        const commonIdx = result.loadOrder.indexOf(common.identifier);
        const productIdx = result.loadOrder.indexOf(product.identifier);
        expect(commonIdx).toBeLessThan(productIdx);
      });

      it('should detect missing schema when CommonTypes is not provided', () => {
        const main = parseMetadata('MainWithRef.schema.json', mainWithRefJsonSchema);

        const result = JsonSchemaAnalysisService.analyze([main]);

        expect(result.missingReferences.length).toBeGreaterThan(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('$id-based resolution', () => {
      it('should resolve ref by $id identifier', () => {
        const schemaA = createMetadata('http://example.com/a.json', 'a.json', {
          type: 'object',
          properties: {
            b: { $ref: 'http://example.com/b.json#/definitions/Type' },
          },
        });
        const schemaB = createMetadata('http://example.com/b.json', 'b.json', {
          type: 'object',
          definitions: { Type: { type: 'string' } },
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.edges).toHaveLength(1);
        expect(result.edges[0].from).toBe('http://example.com/a.json');
        expect(result.edges[0].to).toBe('http://example.com/b.json');
        expect(result.missingReferences).toHaveLength(0);
      });
    });

    describe('empty schemas', () => {
      it('should handle empty schema list', () => {
        const result = JsonSchemaAnalysisService.analyze([]);

        expect(result.nodes.size).toBe(0);
        expect(result.edges).toHaveLength(0);
        expect(result.loadOrder).toHaveLength(0);
      });
    });

    describe('duplicate $id detection', () => {
      it('should detect duplicate $id across two files', () => {
        const schemaA = createMetadata('http://example.com/types.json', 'a/types.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });
        const schemaB = createMetadata('http://example.com/types.json', 'b/types.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const duplicateErrors = result.errors.filter((e) => e.includes('Duplicate $id'));
        expect(duplicateErrors).toHaveLength(1);
        expect(duplicateErrors[0]).toContain('http://example.com/types.json');
        expect(duplicateErrors[0]).toContain('a/types.json');
        expect(duplicateErrors[0]).toContain('b/types.json');
      });

      it('should not report duplicate when $id is absent', () => {
        const schemaA = createMetadata('a.json', 'a.json', { type: 'object' });
        const schemaB = createMetadata('b.json', 'b.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const duplicateErrors = result.errors.filter((e) => e.includes('Duplicate $id'));
        expect(duplicateErrors).toHaveLength(0);
      });

      it('should not report duplicate for single schema with $id', () => {
        const schema = createMetadata('http://example.com/schema.json', 'schema.json', {
          $id: 'http://example.com/schema.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schema]);

        const duplicateErrors = result.errors.filter((e) => e.includes('Duplicate $id'));
        expect(duplicateErrors).toHaveLength(0);
      });

      it('should detect duplicate $id across three files', () => {
        const schemaA = createMetadata('http://example.com/types.json', 'a.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });
        const schemaB = createMetadata('http://example.com/types.json', 'b.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });
        const schemaC = createMetadata('http://example.com/types.json', 'c.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB, schemaC]);

        const duplicateErrors = result.errors.filter((e) => e.includes('Duplicate $id'));
        expect(duplicateErrors).toHaveLength(1);
        expect(duplicateErrors[0]).toContain('a.json');
        expect(duplicateErrors[0]).toContain('b.json');
        expect(duplicateErrors[0]).toContain('c.json');
      });

      it('should not report duplicate when $id values are different', () => {
        const schemaA = createMetadata('http://example.com/a.json', 'a.json', {
          $id: 'http://example.com/a.json',
          type: 'object',
        });
        const schemaB = createMetadata('http://example.com/b.json', 'b.json', {
          $id: 'http://example.com/b.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const duplicateErrors = result.errors.filter((e) => e.includes('Duplicate $id'));
        expect(duplicateErrors).toHaveLength(0);
      });
    });

    describe('$id vs file path conflict detection', () => {
      it('should warn when $id matches another schema file path', () => {
        const schemaA = createMetadata('http://example.com/types.json', 'schemas/types.json', {
          $id: 'b.json',
          type: 'object',
        });
        const schemaB = createMetadata('b.json', 'b.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const idWarnings = result.warnings.filter((w) => w.includes('conflicts with file path'));
        expect(idWarnings).toHaveLength(1);
        expect(idWarnings[0]).toContain('b.json');
        expect(idWarnings[0]).toContain('schemas/types.json');
      });

      it('should not warn when $id matches own file path', () => {
        const schema = createMetadata('schema.json', 'schema.json', {
          $id: 'schema.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schema]);

        const idWarnings = result.warnings.filter((w) => w.includes('conflicts with file path'));
        expect(idWarnings).toHaveLength(0);
      });

      it('should not warn when no $id conflicts exist', () => {
        const schemaA = createMetadata('http://example.com/a.json', 'a.json', {
          $id: 'http://example.com/a.json',
          type: 'object',
        });
        const schemaB = createMetadata('http://example.com/b.json', 'b.json', {
          $id: 'http://example.com/b.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const idWarnings = result.warnings.filter((w) => w.includes('conflicts with file path'));
        expect(idWarnings).toHaveLength(0);
      });

      it('should not warn when schema has no $id', () => {
        const schemaA = createMetadata('a.json', 'a.json', { type: 'object' });
        const schemaB = createMetadata('b.json', 'b.json', { type: 'object' });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        const idWarnings = result.warnings.filter((w) => w.includes('conflicts with file path'));
        expect(idWarnings).toHaveLength(0);
      });
    });

    describe('conflict detection integration', () => {
      it('should not affect existing analysis results when conflicts are detected', () => {
        const schemaA = createMetadata('http://example.com/types.json', 'a/types.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
          properties: {
            b: { $ref: './b.json' },
          },
        });
        const schemaB = createMetadata('http://example.com/types.json', 'b/types.json', {
          $id: 'http://example.com/types.json',
          type: 'object',
        });

        const result = JsonSchemaAnalysisService.analyze([schemaA, schemaB]);

        expect(result.nodes.size).toBeGreaterThan(0);
        expect(result.loadOrder.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.includes('Duplicate $id'))).toBe(true);
      });

      it('should detect duplicate $id through analyzeFromDefinitionFiles', () => {
        const definitionFiles = {
          'a/types.json': JSON.stringify({
            $id: 'http://example.com/types.json',
            type: 'object',
          }),
          'b/types.json': JSON.stringify({
            $id: 'http://example.com/types.json',
            type: 'object',
          }),
        };

        const result = JsonSchemaAnalysisService.analyzeFromDefinitionFiles(definitionFiles);

        expect(result.errors.some((e) => e.includes('Duplicate $id'))).toBe(true);
      });
    });
  });

  describe('analyzeFromDefinitionFiles', () => {
    it('should parse and analyze definition files', () => {
      const definitionFiles = {
        'MainWithRef.schema.json': mainWithRefJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      };

      const result = JsonSchemaAnalysisService.analyzeFromDefinitionFiles(definitionFiles);

      expect(result.missingReferences).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
      expect(result.nodes.size).toBe(2);
    });

    it('should throw error for invalid JSON', () => {
      const definitionFiles = {
        'invalid.json': 'not valid json',
      };

      expect(() => {
        JsonSchemaAnalysisService.analyzeFromDefinitionFiles(definitionFiles);
      }).toThrow('Failed to parse JSON schema');
    });

    it('should analyze multi-file scenario', () => {
      const definitionFiles = {
        'Order.schema.json': orderJsonSchema,
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      };

      const result = JsonSchemaAnalysisService.analyzeFromDefinitionFiles(definitionFiles);

      expect(result.errors).toHaveLength(0);
      expect(result.circularDependencies).toHaveLength(0);
      expect(result.nodes.size).toBe(3);
      expect(result.loadOrder).toHaveLength(3);
    });
  });
});
