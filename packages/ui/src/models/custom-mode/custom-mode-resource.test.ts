import { parse } from 'yaml';

import { ITile } from '../../components/Catalog';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode, IVisualizationNodeData } from '../visualization/base-visual-entity';
import { CustomModeResource } from './custom-mode-resource';
import { CustomModeFile } from './custom-mode-types';
import { CustomModeVisualEntity } from './custom-mode-visual-entity';

const twoModeFile: CustomModeFile = {
  customModes: [
    {
      slug: 'plan',
      name: 'Plan',
      description: 'Planning mode',
      roleDefinition: 'You plan things.',
      whenToUse: 'When planning.',
      groups: ['read'],
    },
    {
      slug: 'code',
      name: 'Code',
      description: 'Coding mode',
      roleDefinition: 'You write code.',
      whenToUse: 'When coding.',
      groups: ['read', 'edit'],
    },
  ],
};

describe('CustomModeResource', () => {
  describe('initialize()', () => {
    it('creates one visual entity per mode', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      expect(resource.getVisualEntities()).toHaveLength(2);
    });

    it('visual entities are CustomModeVisualEntity instances', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      resource.getVisualEntities().forEach((e) => {
        expect(e).toBeInstanceOf(CustomModeVisualEntity);
      });
    });

    it('handles empty customModes array', async () => {
      const resource = new CustomModeResource({ customModes: [] });
      await resource.initialize();
      expect(resource.getVisualEntities()).toHaveLength(0);
    });

    it('handles undefined rawFile', async () => {
      const resource = new CustomModeResource(undefined);
      await resource.initialize();
      expect(resource.getVisualEntities()).toHaveLength(0);
    });
  });

  describe('getEntities()', () => {
    it('returns empty array (no non-visual entities)', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      expect(resource.getEntities()).toEqual([]);
    });
  });

  describe('supportsMultipleVisualEntities()', () => {
    it('returns true', () => {
      expect(new CustomModeResource(undefined).supportsMultipleVisualEntities()).toBe(true);
    });
  });

  describe('getCompatibleRuntimes()', () => {
    it('returns ["Bob"]', () => {
      expect(new CustomModeResource(undefined).getCompatibleRuntimes()).toEqual(['Bob']);
    });
  });

  describe('toJSON()', () => {
    it('returns a CustomModeFile with all modes', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const json = resource.toJSON() as CustomModeFile;
      expect(json.customModes).toHaveLength(2);
      expect(json.customModes[0].slug).toBe('plan');
      expect(json.customModes[1].slug).toBe('code');
    });
  });

  describe('toSourceCode()', () => {
    it('serializes to YAML with customModes root key', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const yaml = await resource.toSourceCode();
      expect(yaml).toContain('customModes:');
      expect(yaml).toContain('slug: plan');
      expect(yaml).toContain('slug: code');
    });

    it('produces canonical field order: slug before name before description', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const yaml = await resource.toSourceCode();
      const slugIdx = yaml.indexOf('slug:');
      const nameIdx = yaml.indexOf('name:');
      const descIdx = yaml.indexOf('description:');
      expect(slugIdx).toBeLessThan(nameIdx);
      expect(nameIdx).toBeLessThan(descIdx);
    });

    it('is stable: parse → serialize produces identical output twice', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const first = await resource.toSourceCode();
      const resource2 = new CustomModeResource(parse(first) as CustomModeFile);
      await resource2.initialize();
      const second = await resource2.toSourceCode();
      expect(second).toBe(first);
    });
  });

  describe('addNewEntity()', () => {
    it('appends a new entity and returns its id', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const id = resource.addNewEntity();
      expect(id).toBeTruthy();
      expect(resource.getVisualEntities()).toHaveLength(3);
    });

    it('new entity has slug "new-mode"', async () => {
      const resource = new CustomModeResource({ customModes: [] });
      await resource.initialize();
      const id = resource.addNewEntity();
      const entity = resource.getVisualEntities().find((e) => e.id === id);
      expect((entity!.toJSON() as ReturnType<CustomModeVisualEntity['toJSON']>).slug).toBe('new-mode');
    });
  });

  describe('removeEntity()', () => {
    it('removes the entity with the given id', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      const [first] = resource.getVisualEntities();
      resource.removeEntity([first.id]);
      expect(resource.getVisualEntities()).toHaveLength(1);
      expect(resource.getVisualEntities()[0].id).not.toBe(first.id);
    });

    it('is a no-op for undefined ids', async () => {
      const resource = new CustomModeResource(twoModeFile);
      await resource.initialize();
      resource.removeEntity(undefined);
      expect(resource.getVisualEntities()).toHaveLength(2);
    });
  });
  describe('getCompatibleComponents()', () => {
    it('returns a TileFilter function', () => {
      const filter = new CustomModeResource(undefined).getCompatibleComponents(
        AddStepMode.AppendStep,
        {} as IVisualizationNodeData,
      );
      expect(typeof filter).toBe('function');
    });

    it('accepts tiles of type CatalogKind.BobNodes', () => {
      const filter = new CustomModeResource(undefined).getCompatibleComponents(
        AddStepMode.AppendStep,
        {} as IVisualizationNodeData,
      );
      const tile = { type: CatalogKind.BobNodes } as ITile;
      expect(filter(tile)).toBe(true);
    });

    it('rejects tiles of other catalog kinds', () => {
      const filter = new CustomModeResource(undefined).getCompatibleComponents(
        AddStepMode.AppendStep,
        {} as IVisualizationNodeData,
      );
      for (const kind of [CatalogKind.Component, CatalogKind.Pattern, CatalogKind.Kamelet, CatalogKind.TestAction]) {
        expect(filter({ type: kind } as ITile)).toBe(false);
      }
    });
  });
});
