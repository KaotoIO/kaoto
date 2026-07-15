import { JSONSchema4 } from 'json-schema';

import rootSchema from '../../../../stubs/bob-catalog/custom-mode-schema.json';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../../../bob/bob-catalog-index';
import { ICamelProcessorDefinition } from '../../../camel/camel-processors-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { CamelCatalogService } from '../camel-catalog.service';
import { CustomModeSchemaService } from './custom-mode-schema.service';

describe('CustomModeSchemaService', () => {
  beforeEach(() => {
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, {
      [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: {
        propertiesSchema: rootSchema as JSONSchema4,
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

    it('marks slug and name as required', () => {
      expect(CustomModeSchemaService.getRootSchema().required).toEqual(expect.arrayContaining(['slug', 'name']));
    });

    it('sets x-component textarea on roleDefinition and whenToUse', () => {
      const { properties } = CustomModeSchemaService.getRootSchema();
      expect((properties!['roleDefinition'] as Record<string, unknown>)['x-component']).toBe('textarea');
      expect((properties!['whenToUse'] as Record<string, unknown>)['x-component']).toBe('textarea');
    });

    it('groups is an array with 8-item enum', () => {
      const { properties } = CustomModeSchemaService.getRootSchema();
      const groups = properties!['groups'] as Record<string, unknown>;
      expect(groups.type).toBe('array');
      const items = groups.items as Record<string, unknown>;
      expect(items.enum as string[]).toHaveLength(8);
      expect(items.enum).toEqual(
        expect.arrayContaining(['read', 'edit', 'command', 'mcp', 'subagent', 'skill', 'execute', 'todo']),
      );
    });
  });

  describe('getNodeSchema', () => {
    it('returns undefined when no catalog entry exists', () => {
      expect(CustomModeSchemaService.getNodeSchema('section')).toBeUndefined();
      expect(CustomModeSchemaService.getNodeSchema('unknown')).toBeUndefined();
    });

    it('returns schema from Bob tool or component catalog when loaded', () => {
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
  });
});
