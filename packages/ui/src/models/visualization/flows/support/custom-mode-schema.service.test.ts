import { CustomModeSchemaService } from './custom-mode-schema.service';

describe('CustomModeSchemaService', () => {
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
    it('returns undefined for any nodeType (stub)', () => {
      expect(CustomModeSchemaService.getNodeSchema('section')).toBeUndefined();
      expect(CustomModeSchemaService.getNodeSchema('unknown')).toBeUndefined();
    });
  });
});
