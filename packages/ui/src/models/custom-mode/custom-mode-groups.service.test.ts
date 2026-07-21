import componentsStub from '../../stubs/bob-catalog/bob-components.json';
import modesStub from '../../stubs/bob-catalog/bob-modes.json';
import toolsStub from '../../stubs/bob-catalog/bob-tools.json';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../bob/bob-catalog-index';
import { ICamelProcessorDefinition } from '../camel/camel-processors-catalog';
import { CatalogKind } from '../catalog-kind';
import { CamelCatalogService } from '../visualization/flows/camel-catalog.service';
import { CustomModeGroupsService } from './custom-mode-groups.service';
import { CustomMode } from './custom-mode-types';

const makeMode = (overrides?: Partial<CustomMode>): CustomMode => ({
  slug: 'test-mode',
  name: 'Test Mode',
  description: 'A test mode',
  roleDefinition: 'You are a test assistant.',
  whenToUse: 'Use this for testing.',
  groups: [],
  ...overrides,
});

/** Load the stub catalogs into CamelCatalogService (mirrors what fetchBobCatalog does at runtime). */
function loadStubCatalog() {
  CamelCatalogService.setCatalogKey(CatalogKind.BobTool, toolsStub as never);
  CamelCatalogService.setCatalogKey(CatalogKind.BobComponent, componentsStub as never);
  const rootModeEntry = (modesStub as Record<string, { propertiesSchema?: unknown }>)['mode'];
  CamelCatalogService.setCatalogKey(CatalogKind.Entity, {
    [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: {
      propertiesSchema: rootModeEntry?.propertiesSchema,
    } as ICamelProcessorDefinition,
  });
}

describe('CustomModeGroupsService (catalog-driven)', () => {
  beforeEach(() => {
    loadStubCatalog();
  });

  afterEach(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getRequiredGroups', () => {
    it('returns groups from the catalog for a known tool', () => {
      // write_file stub has group: "file,write"
      expect(CustomModeGroupsService.getRequiredGroups(['write_file'])).toEqual(
        expect.arrayContaining(['file', 'write']),
      );
    });

    it('deduplicates groups shared by multiple tools', () => {
      // read_file: "file,read"  write_file: "file,write" — "file" appears once
      const groups = CustomModeGroupsService.getRequiredGroups(['read_file', 'write_file']);
      expect(groups.filter((g) => g === 'file')).toHaveLength(1);
    });

    it('returns an empty array for an empty list', () => {
      expect(CustomModeGroupsService.getRequiredGroups([])).toEqual([]);
    });

    it('silently ignores names not in the catalog', () => {
      expect(CustomModeGroupsService.getRequiredGroups(['not_a_tool'])).toEqual([]);
    });

    it('returns groups for a bobComponent (text-node has no group field — returns empty)', () => {
      // text-node stub has no `group` field
      expect(CustomModeGroupsService.getRequiredGroups(['text-node'])).toEqual([]);
    });
  });

  describe('extractNodeNames', () => {
    it('detects bold-markdown tool references present in catalog', () => {
      expect(CustomModeGroupsService.extractNodeNames('Use **write_file** here.')).toContain('write_file');
    });

    it('detects inline-code tool references', () => {
      expect(CustomModeGroupsService.extractNodeNames('Call `read_file` here.')).toContain('read_file');
    });

    it('deduplicates repeated references', () => {
      const nodes = CustomModeGroupsService.extractNodeNames('**write_file** and **write_file** again');
      expect(nodes.filter((n) => n === 'write_file')).toHaveLength(1);
    });

    it('ignores words that are not in the catalog', () => {
      expect(CustomModeGroupsService.extractNodeNames('**unknown_thing**')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(CustomModeGroupsService.extractNodeNames('')).toEqual([]);
    });
  });

  describe('syncGroupsForNode', () => {
    it('adds groups for a known tool', () => {
      const mode = makeMode({ groups: [] });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      expect(mode.groups).toEqual(expect.arrayContaining(['file', 'write']));
    });

    it('does not duplicate groups already present', () => {
      const mode = makeMode({ groups: ['file', 'write'] });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      expect((mode.groups as string[]).filter((g) => g === 'write')).toHaveLength(1);
    });

    it('does not add a plain-string group when a tuple with the same name already exists', () => {
      // Tuple ["write", { fileRegex: "..." }] must count as "write" for deduplication.
      const mode = makeMode({ groups: [['write', { fileRegex: '\\.yaml$' }], 'file'] });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      // "write" is already represented by the tuple — must not be added again.
      const writeEntries = mode.groups.filter((g) => (Array.isArray(g) ? g[0] === 'write' : g === 'write'));
      expect(writeEntries).toHaveLength(1);
      // "file" is already a plain string — must not be duplicated either.
      expect(mode.groups.filter((g) => g === 'file')).toHaveLength(1);
    });

    it('is a no-op for an unknown node name', () => {
      const mode = makeMode({ groups: ['read'] });
      CustomModeGroupsService.syncGroupsForNode('not_in_catalog', mode);
      expect(mode.groups).toEqual(['read']);
    });

    it('never removes existing groups', () => {
      // Existing groups are preserved regardless of what the node requires.
      const mode = makeMode({ groups: ['read', 'mcp', 'subagent'] });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      expect(mode.groups).toContain('read');
      expect(mode.groups).toContain('mcp');
      expect(mode.groups).toContain('subagent');
      expect(mode.groups).toContain('file');
      expect(mode.groups).toContain('write');
    });

    it('inserts multiple groups in enum order', () => {
      // read_file: "file,read" — read(0) is in enum, file is not
      // switch_mode: "mode" — mode(8) is in enum
      // Calling for each: read(0) must appear before mode(8) in the groups array
      const mode = makeMode({ groups: [] });
      CustomModeGroupsService.syncGroupsForNode('read_file', mode);
      CustomModeGroupsService.syncGroupsForNode('switch_mode', mode);
      const groups = mode.groups as string[];
      expect(groups.indexOf('read')).toBeLessThan(groups.indexOf('mode'));
    });

    it('within a single call, enum-ordered groups come before non-enum groups', () => {
      // write_file: "file,write" — write(11) is in enum, file is not
      // A single syncGroupsForNode call must place write before file.
      const mode = makeMode({ groups: [] });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      const groups = mode.groups as string[];
      expect(groups.indexOf('write')).toBeLessThan(groups.indexOf('file'));
    });
  });

  describe('catalog not loaded (graceful fallback)', () => {
    beforeEach(() => {
      CamelCatalogService.clearCatalogs();
    });

    it('getRequiredGroups returns empty array when catalog is absent', () => {
      expect(CustomModeGroupsService.getRequiredGroups(['write_file'])).toEqual([]);
    });

    it('extractNodeNames returns empty array when catalog is absent', () => {
      expect(CustomModeGroupsService.extractNodeNames('Use **write_file**.')).toEqual([]);
    });

    it('syncGroupsForNode is a no-op when catalog is absent', () => {
      const mode = makeMode({ groups: ['read'], customInstructions: 'Use **write_file**.' });
      CustomModeGroupsService.syncGroupsForNode('write_file', mode);
      expect(mode.groups).toEqual(['read']);
    });
  });
});
