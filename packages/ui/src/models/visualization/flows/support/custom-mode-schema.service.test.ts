import { JSONSchema4 } from 'json-schema';

import modesStub from '../../../../stubs/bob-catalog/bob-modes.json';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../../../bob/bob-catalog-index';
import { ICamelProcessorDefinition } from '../../../camel/camel-processors-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CustomModeSchemaService } from './custom-mode-schema.service';

describe('CustomModeSchemaService', () => {
  beforeEach(() => {
    // Mirror what fetchBobCatalog does: extract propertiesSchema from modes['mode']
    const rootModeEntry = (modesStub as Record<string, { propertiesSchema?: JSONSchema4 }>)['mode'];
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, {
      [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: {
        propertiesSchema: rootModeEntry?.propertiesSchema,
      } as ICamelProcessorDefinition,
    });
  });

  afterEach(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getRootSchema', () => {
    it('returns an object schema', () => {
      expect(CustomModeSchemaService.getRootSchema().type).toBe('object');
    });

    it('includes all expected top-level properties', () => {
      const { properties } = CustomModeSchemaService.getRootSchema();
      expect(Object.keys(properties!)).toEqual(
        expect.arrayContaining(['slug', 'name', 'description', 'roleDefinition', 'whenToUse', 'groups']),
      );
    });

    it('marks slug, name and roleDefinition as required', () => {
      expect(CustomModeSchemaService.getRootSchema().required).toEqual(
        expect.arrayContaining(['slug', 'name', 'roleDefinition']),
      );
    });

    it('groups is an array with the correct enum values', () => {
      const { properties } = CustomModeSchemaService.getRootSchema();
      const groups = properties!['groups'] as Record<string, unknown>;
      expect(groups.type).toBe('array');
      const items = groups.items as Record<string, unknown>;
      expect(items.enum).toEqual(
        expect.arrayContaining([
          'read',
          'edit',
          'execute',
          'mcp',
          'subagent',
          'skill',
          'mode',
          'command',
          'browser',
          'write',
        ]),
      );
    });
  });

  describe('getNodeSchema', () => {
    it('returns undefined when no catalog entry exists', () => {
      expect(CustomModeSchemaService.getNodeSchema('section')).toBeUndefined();
      expect(CustomModeSchemaService.getNodeSchema('unknown')).toBeUndefined();
    });

    it('returns schema from BobTool catalog when loaded', () => {
      const toolSchema = { type: 'object', properties: { path: { type: 'string' } } } as JSONSchema4;
      CamelCatalogService.setCatalogKey(CatalogKind.BobTool, {
        read_file: {
          kind: CatalogKind.BobTool,
          name: 'read_file',
          propertiesSchema: toolSchema,
        },
      });

      expect(CustomModeSchemaService.getNodeSchema('read_file')).toEqual(toolSchema);
    });

    it('falls back to text-node schema for unknown node types', () => {
      const textNodeSchema = { type: 'object', properties: { content: { type: 'string' } } } as JSONSchema4;
      CamelCatalogService.setCatalogKey(CatalogKind.BobComponent, {
        'text-node': {
          kind: CatalogKind.BobComponent,
          name: 'text-node',
          propertiesSchema: textNodeSchema,
        },
      });

      expect(CustomModeSchemaService.getNodeSchema('step')).toEqual(textNodeSchema);
      expect(CustomModeSchemaService.getNodeSchema('unknown-type')).toEqual(textNodeSchema);
    });

    it('returns undefined when neither specific type nor text-node fallback is in catalog', () => {
      expect(CustomModeSchemaService.getNodeSchema('step')).toBeUndefined();
    });
  });
});
